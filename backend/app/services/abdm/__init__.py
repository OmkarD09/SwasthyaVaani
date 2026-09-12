"""
ABDM Gateway Module - Dual-Mode Architecture & Interoperability Defense
"""
from app.services.abdm.gateway_adapter import AbdmGatewayInterface
from app.services.abdm.gateway_factory import get_abdm_gateway

__all__ = ["AbdmGatewayInterface", "get_abdm_gateway"]
