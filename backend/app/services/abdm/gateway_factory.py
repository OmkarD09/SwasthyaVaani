import logging
from app.core.config import settings
from app.services.abdm.gateway_adapter import AbdmGatewayInterface
from app.services.abdm.live_gateway import LiveAbdmGateway
from app.services.abdm.simulated_gateway import SimulatedAbdmGateway

logger = logging.getLogger(__name__)

_gateway_instance: AbdmGatewayInterface | None = None
_gateway_override: AbdmGatewayInterface | None = None


def get_abdm_gateway() -> AbdmGatewayInterface:
    """
    Factory resolving the appropriate ABDM Gateway Adapter based on settings.
    Guarantees resilient fallback to Simulation mode if Sandbox credentials are absent.
    """
    global _gateway_instance, _gateway_override

    if _gateway_override is not None:
        return _gateway_override

    mode = (settings.ABDM_GATEWAY_MODE or "simulation").strip().lower()

    if mode in ("sandbox", "live"):
        if not settings.ABDM_CLIENT_ID or not settings.ABDM_CLIENT_SECRET:
            logger.warning(
                "ABDM_GATEWAY_MODE is configured as '%s', but ABDM_CLIENT_ID or "
                "ABDM_CLIENT_SECRET is missing. Falling back to High-Availability Simulated Gateway.",
                mode,
            )
            return SimulatedAbdmGateway()

        if _gateway_instance is None or not isinstance(_gateway_instance, LiveAbdmGateway):
            _gateway_instance = LiveAbdmGateway()
        return _gateway_instance

    # Default to Simulated Gateway
    if _gateway_instance is None or not isinstance(_gateway_instance, SimulatedAbdmGateway):
        _gateway_instance = SimulatedAbdmGateway()
    return _gateway_instance


def set_abdm_gateway_override(gateway: AbdmGatewayInterface | None) -> None:
    """
    Overrides the gateway instance for testing purposes.
    """
    global _gateway_override
    _gateway_override = gateway


def reset_abdm_gateway() -> None:
    """
    Resets any cached or overridden gateway instance.
    """
    global _gateway_instance, _gateway_override
    _gateway_instance = None
    _gateway_override = None
