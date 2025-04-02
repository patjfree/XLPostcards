from googleapiclient.discovery import build

class GooglePhotosService:
    def __init__(self, credentials):
        self.credentials = credentials
        self.service = build('photoslibrary', 'v1', credentials=credentials)
    
    def get_albums(self):
        """Get all albums from Google Photos."""
        try:
            results = self.service.albums().list().execute()
            return results.get('albums', [])
        except Exception as e:
            print(f"Error getting albums: {e}")
            return []

    def get_media_items(self, album_id=None):
        """Get media items, optionally filtered by album."""
        try:
            if album_id:
                results = self.service.mediaItems().search(
                    body={'albumId': album_id}
                ).execute()
            else:
                results = self.service.mediaItems().list().execute()
            return results.get('mediaItems', [])
        except Exception as e:
            print(f"Error getting media items: {e}")
            return [] 