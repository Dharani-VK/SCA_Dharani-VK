"""
Start the Smart Campus Assistant backend server with proper configuration for file uploads.
"""
import uvicorn
import os

if __name__ == "__main__":
    # Get max upload size from environment (default 200MB)
    max_upload_mb = int(os.getenv("MAX_UPLOAD_SIZE_MB", "200"))
    
    # Convert to bytes and add overhead for multipart form data
    # Uvicorn limit should be higher than application limit to avoid connection drops
    limit_bytes = (max_upload_mb + 50) * 1024 * 1024  # Add 50MB overhead
    
    print(f"Starting Smart Campus Assistant Backend")
    print(f"Maximum upload size: {max_upload_mb}MB")
    print(f"Uvicorn body size limit: {limit_bytes / (1024*1024):.0f}MB")
    print(f"Server will be available at: http://127.0.0.1:8000")
    print(f"API documentation: http://127.0.0.1:8000/docs")
    print("-" * 60)
    
    # Configure uvicorn with proper settings for large file uploads
    config = uvicorn.Config(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
        access_log=True,
        timeout_keep_alive=120,  # 2 minutes keep-alive for large uploads
        timeout_graceful_shutdown=30,
        # Increase limits for large file uploads
        limit_concurrency=1000,
        limit_max_requests=10000,
        # This is the key setting for large request bodies
        h11_max_incomplete_event_size=limit_bytes,
    )
    
    server = uvicorn.Server(config)
    server.run()
