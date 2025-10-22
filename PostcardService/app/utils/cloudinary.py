import cloudinary
import cloudinary.uploader


def upload_to_cloudinary(image_data: bytes, filename: str) -> str:
    """Upload image to Cloudinary using official SDK"""
    try:
        print(f"[CLOUDINARY] SDK Upload: {filename}, size: {len(image_data)} bytes")
        
        # Upload using official Cloudinary SDK
        result = cloudinary.uploader.upload(
            image_data,
            resource_type="image",
            folder="postcards/backs",
            public_id=filename.replace('.jpg', '').replace('.jpeg', ''),
            overwrite=True,
            unique_filename=False
        )
        
        print(f"[CLOUDINARY] SDK upload successful: {result['secure_url']}")
        print(f"[CLOUDINARY] Public ID created: {result['public_id']}")
        return result["secure_url"]
        
    except Exception as e:
        print(f"[CLOUDINARY] SDK upload failed: {e}")
        raise