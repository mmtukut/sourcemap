import time
from datetime import datetime
from django.http import HttpResponse
from .models import AuditLog, User


class AuditMiddleware:
    """
    Django middleware to log all requests and their outcomes for provenance tracking.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = time.time()

        # Capture request details
        request_details = {
            "method": request.method,
            "url": request.build_absolute_uri(),
            "headers": dict(request.META),
            "client": self.get_client_ip(request)
        }

        # Process the request
        response = self.get_response(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log the audit entry
        self._log_audit_entry(
            request_details,
            response.status_code,
            duration,
            request
        )

        return response

    def get_client_ip(self, request):
        """Get the client's IP address from the request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _log_audit_entry(self, request_details: dict, status_code: int, duration: float, request):
        """
        Create an audit log entry in the database.
        """
        try:
            # Extract user_id from the request if available (this might need adjustment based on auth system)
            user_id = getattr(request, 'user_id', None)  # Assuming user_id is added to request
            
            # Extract user from the session if using Django's auth system
            if hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                user_id = str(user.id)
            else:
                user_id = request.GET.get('user_id')  # Fallback to query parameter as in original

            audit_log = AuditLog.objects.create(
                user_id_id=user_id,  # Link to user if available
                action=f"{request_details['method']} {request_details['url']}",
                ip=request_details['client'],
                data={
                    "request_method": request_details['method'],
                    "request_url": request_details['url'],
                    "request_headers": {k: v for k, v in request_details['headers'].items() 
                                        if k in ['HTTP_USER_AGENT', 'CONTENT_TYPE', 'HTTP_REFERER', 'HTTP_X_FORWARDED_FOR']},
                    "response_status": status_code,
                    "request_duration": duration
                },
                data_lineage={
                    "request_timestamp": datetime.utcnow().isoformat(),
                    "processing_duration": duration
                },
                status="completed" if 200 <= status_code < 300 else "failed",
            )
        except Exception as e:
            print(f"Error logging audit entry: {str(e)}")


def audit_log(action: str, user_id_required: bool = False):
    """
    Decorator to add detailed audit logging to specific Django views.
    """
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Extract user_id if available
            user_id = request.GET.get('user_id')
            
            # Validate user_id if required
            if user_id_required and not user_id:
                from django.http import JsonResponse
                return JsonResponse({'error': 'user_id is required for this action'}, status=400)

            start_time = time.time()
            
            try:
                # Execute the view function
                result = view_func(request, *args, **kwargs)
                
                # Log successful execution
                _log_detailed_audit(
                    action=action,
                    user_id=user_id,
                    request=request,
                    status="success",
                    duration=time.time() - start_time,
                    result_summary=str(result)
                )
                
                return result
            except Exception as e:
                # Log failure
                _log_detailed_audit(
                    action=action,
                    user_id=user_id,
                    request=request,
                    status="failed",
                    duration=time.time() - start_time,
                    error=str(e)
                )
                
                # Re-raise the exception
                raise e

        return wrapper
    return decorator


def _log_detailed_audit(action: str, user_id: str, request, 
                       status: str, duration: float, 
                       result_summary: str = None, error: str = None):
    """
    Helper function to create a detailed audit log.
    """
    try:
        audit_log = AuditLog.objects.create(
            user_id_id=user_id,
            action=action,
            ip=request.META.get('REMOTE_ADDR'),
            data={
                "request_url": request.build_absolute_uri(),
                "request_method": request.method,
                "result_summary": result_summary,
                "error": error,
                "processing_duration": duration,
                "timestamp": datetime.utcnow().isoformat()
            },
            data_lineage={
                "operation": action,
                "initiator": user_id,
                "processing_timestamp": datetime.utcnow().isoformat(),
                "processing_duration": duration
            },
            status=status,
        )
    except Exception as e:
        print(f"Error in detailed audit logging: {str(e)}")