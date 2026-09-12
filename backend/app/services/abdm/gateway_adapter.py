from abc import ABC, abstractmethod
from typing import Any


class AbdmGatewayInterface(ABC):
    """
    Abstract Base Class defining the ABDM Gateway Adapter contract.
    Enables pluggable switching between live NHA Sandbox APIs and an
    offline, high-availability simulated gateway for resilient interoperability.
    """

    @abstractmethod
    async def get_session_token(self) -> str:
        """
        Obtains or refreshes an authenticated bearer session token from the gateway.
        """
        pass

    @abstractmethod
    async def init_auth(self, abha_id: str, auth_mode: str = "MOBILE_OTP") -> dict[str, Any]:
        """
        Initiates ABHA authentication (e.g. sends Mobile OTP).
        Returns transaction ID and status.
        """
        pass

    @abstractmethod
    async def confirm_auth(self, txn_id: str, otp: str) -> dict[str, Any]:
        """
        Confirms authentication with OTP and retrieves the patient's verified demographic profile.
        """
        pass

    @abstractmethod
    async def verify_abha(self, abha_identifier: str) -> dict[str, Any]:
        """
        Verifies whether an ABHA number or address exists and is active.
        """
        pass

    @abstractmethod
    async def push_hip_health_data(
        self, bundle: dict[str, Any], care_context_id: str
    ) -> dict[str, Any]:
        """
        Transfers an NRCES-compliant FHIR R4 Bundle to the ABDM Health Information Provider (HIP) network.
        """
        pass

    @abstractmethod
    async def check_gateway_health(self) -> dict[str, Any]:
        """
        Performs a health check and latency ping against the gateway.
        """
        pass
