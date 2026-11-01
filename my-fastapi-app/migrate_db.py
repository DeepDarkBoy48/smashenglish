from database import get_db_connection

def migrate():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            # Check if columns already exist
            cursor.execute("SHOW COLUMNS FROM saved_words LIKE 'reading_id'")
            if not cursor.fetchone():
                print("Adding reading_id column...")
                cursor.execute("ALTER TABLE saved_words ADD COLUMN reading_id INT NULL")
                cursor.execute("CREATE INDEX idx_reading_id ON saved_words(reading_id)")
            
            cursor.execute("SHOW COLUMNS FROM saved_words LIKE 'video_id'")
            if not cursor.fetchone():
                print("Adding video_id column...")
                cursor.execute("ALTER TABLE saved_words ADD COLUMN video_id INT NULL")
                cursor.execute("CREATE INDEX idx_video_id ON saved_words(video_id)")
            
            print("Migration completed successfully.")
        connection.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    migrate()
