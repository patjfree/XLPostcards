from fastapi import APIRouter
from app.models.schemas import AppErrorLog

router = APIRouter()


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "PostcardService", "version": "2.1.1"}


@router.post("/log-app-error")
async def log_app_error(error_log: AppErrorLog):
    """Receive and log client-side errors from React Native app"""
    try:
        timestamp = error_log.timestamp
        level = error_log.level.upper()
        message = error_log.message
        build_info = error_log.buildInfo
        
        # Format log message for Railway logs
        log_msg = f"[CLIENT-{level}] {timestamp} | {message}"
        if error_log.stackTrace:
            log_msg += f" | Stack: {error_log.stackTrace[:200]}..."
        
        log_msg += f" | Build: {build_info.get('version', 'unknown')} ({build_info.get('variant', 'unknown')})"
        
        print(log_msg)
        
        # You could also store in database here if needed
        return {"success": True, "logged": True}
        
    except Exception as e:
        print(f"[ERROR] Failed to log client error: {str(e)}")
        return {"success": False, "error": str(e)}