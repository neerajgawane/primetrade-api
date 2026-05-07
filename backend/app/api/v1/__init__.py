from fastapi import APIRouter
from .auth import router as auth_router
from .tasks import router as tasks_router
from .clients import router as clients_router
from .invoices import router as invoices_router
from .payments import router as payments_router
from .dashboard import router as dashboard_router
from .admin import router as admin_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(tasks_router)
api_router.include_router(clients_router)
api_router.include_router(invoices_router)
api_router.include_router(payments_router)
api_router.include_router(dashboard_router)
api_router.include_router(admin_router)
