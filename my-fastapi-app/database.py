"""MySQL连接配置：开发与生产仅通过环境变量切换，连接由调用方finally关闭。"""
import os
import pymysql
from dotenv import load_dotenv

load_dotenv()

# 生产容器走appnet；本地开发通过环境变量选择SSH隧道，不改源码切换地址。
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'mysql-container'),
    'port': int(os.getenv('DB_PORT', '3306')),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'smashenglish'),
    'charset': 'utf8mb4',
    'cursorclass': pymysql.cursors.DictCursor,
    'connect_timeout': 5,
    'read_timeout': 30,
    'write_timeout': 30,
}


def get_db_connection():
    return pymysql.connect(**DB_CONFIG)
