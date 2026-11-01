"""不访问生产数据库或AI，验证同步DB等待不阻塞事件循环及摘要连接生命周期。"""
import asyncio
import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock
import httpx
import main


class Cursor:
    def __init__(self, rows=None, delay=0):
        self.rows = rows or []
        self.delay = delay
    def __enter__(self): return self
    def __exit__(self, *args): pass
    def execute(self, *args): time.sleep(self.delay)
    def fetchall(self): return self.rows


class Connection:
    def __init__(self, rows=None, delay=0):
        self.closed = False
        self.value = Cursor(rows, delay)
    def cursor(self): return self.value
    def close(self): self.closed = True
    def commit(self): pass


class PerformanceTests(unittest.IsolatedAsyncioTestCase):
    async def test_slow_mysql_does_not_block_health(self):
        async with main.lifespan(main.app):
            transport = httpx.ASGITransport(app=main.app)
            async with httpx.AsyncClient(transport=transport, base_url='http://test') as client:
                with patch.object(main, 'get_db_connection', side_effect=lambda: Connection(delay=.3)):
                    started = time.perf_counter()
                    slow = asyncio.create_task(client.get('/fastapi/daily-notes'))
                    await asyncio.sleep(.02)
                    response = await client.get('/fastapi/health')
                    elapsed = time.perf_counter() - started
                    self.assertEqual(response.status_code, 200)
                    self.assertLess(elapsed, .20, '同步DB调用阻塞了事件循环')
                    self.assertEqual((await slow).status_code, 200)

    async def test_summary_loads_all_words_and_closes_before_ai(self):
        connection = Connection([{'word': 'one', 'data': {}}, {'word': 'two', 'data': {}}])
        encounter = {'context': 'context', 'lookup': {'meaning': 'meaning'}}
        result = SimpleNamespace(title='title', prologue='summary', content='content')
        async def generate(words, *args):
            self.assertTrue(connection.closed)
            self.assertEqual([w['word'] for w in words], ['one', 'two'])
            return result
        with patch.object(main, 'get_db_connection', return_value=connection), \
             patch.object(main, 'ensure_v2_payload', return_value={}), \
             patch.object(main, 'get_note_encounters', return_value=[encounter]), \
             patch.object(main, 'save_daily_summary') as save, \
             patch.object(main.gemini, 'generate_daily_summary_service', side_effect=generate):
            response = await main.summarize_daily_note(1, None, {})
            self.assertEqual(response['status'], 'success')
            save.assert_called_once_with(1, result)

    async def test_lookup_save_uses_worker_thread(self):
        import threading
        loop_thread = threading.get_ident()
        saved_by = []
        request = SimpleNamespace(word='word', context='context', url=None, reading_id=None, video_id=None)
        result = SimpleNamespace(model_dump=lambda: {})
        with patch.object(main.gemini, 'quick_lookup_service', new=AsyncMock(return_value=result)), \
             patch.object(main, 'save_word_to_db', side_effect=lambda *args: saved_by.append(threading.get_ident())):
            await main.quick_lookup(request, None, {})
        self.assertNotEqual(saved_by, [loop_thread])
        self.assertEqual(len(saved_by), 1)

if __name__ == '__main__': unittest.main()
