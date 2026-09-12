import asyncio
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings
from app.services.abdm.gateway_adapter import AbdmGatewayInterface


class SimulatedAbdmGateway(AbdmGatewayInterface):
    """
    High-Availability Offline ABDM Gateway Simulator.
    Simulates NHA Sandbox M1 & M2 APIs with zero network latency or external dependencies,
    ensuring live demonstrations and evaluation benchmarks never fail due to government sandbox outages.
    """

    def __init__(self):
        self.facility_id = settings.ABDM_FACILITY_ID
        self.hip_id = settings.ABDM_HIP_ID
        # In-memory transaction registry for realistic verification sessions
        self._active_transactions: dict[str, dict[str, Any]] = {}

    async def get_session_token(self) -> str:
        """
        Simulates instantaneous bearer token acquisition.
        """
        return f"mock-abdm-bearer-token-{uuid.uuid4().hex[:16]}"

    async def init_auth(self, abha_id: str, auth_mode: str = "MOBILE_OTP") -> dict[str, Any]:
        """
        Generates realistic ABDM transaction ID and sends simulated OTP.
        """
        # Slight realistic micro-delay (10-25ms)
        await asyncio.sleep(0.015)

        clean_id = abha_id.strip()
        txn_id = f"txn-sim-{uuid.uuid4().hex[:12]}"

        # Parse or mock mobile number based on ABHA
        digits = re.sub(r"\D", "", clean_id)
        suffix = digits[-4:] if len(digits) >= 4 else "4892"
        masked_mobile = f"******{suffix}"

        self._active_transactions[txn_id] = {
            "abha_id": clean_id,
            "auth_mode": auth_mode,
            "created_at": time.time(),
            "masked_mobile": masked_mobile,
        }

        return {
            "txn_id": txn_id,
            "status": "OTP_SENT",
            "auth_mode": auth_mode,
            "gateway_mode": "simulation",
            "masked_mobile": masked_mobile,
            "message": f"Simulated OTP dispatched to mobile {masked_mobile}. Demo OTP is 123456 (or any 6 digits).",
        }

    async def confirm_auth(self, txn_id: str, otp: str) -> dict[str, Any]:
        """
        Validates OTP and produces an NRCES India Core compliant patient profile.
        Accepts '123456' or any valid 6-digit number.
        """
        await asyncio.sleep(0.02)

        # Validate OTP format (must be 6 digits)
        clean_otp = str(otp).strip()
        if not re.match(r"^\d{6}$", clean_otp):
            return {
                "status": "FAILED",
                "message": "Invalid OTP format. Please enter a 6-digit numeric OTP (e.g. 123456).",
                "gateway_mode": "simulation",
            }

        txn_record = self._active_transactions.get(txn_id, {})
        abha_source = txn_record.get("abha_id", "91-4521-8890-1234")

        is_address = "@" in abha_source
        if is_address:
            formatted_abha = "91-4521-8890-1234"
            abha_address = abha_source
            patient_name = abha_source.split("@")[0].replace(".", " ").title()
        else:
            raw_digits = re.sub(r"\D", "", abha_source)
            if len(raw_digits) == 14:
                formatted_abha = f"{raw_digits[:2]}-{raw_digits[2:6]}-{raw_digits[6:10]}-{raw_digits[10:14]}"
            else:
                formatted_abha = "91-4521-8890-1234"
            abha_address = f"patient.{raw_digits[:6] if raw_digits else 'demo'}@abdm"
            patient_name = "Ananya Sharma"

        return {
            "status": "VERIFIED",
            "abha_number": formatted_abha,
            "abha_address": abha_address,
            "patient_name": patient_name,
            "gender": "F",
            "year_of_birth": 1992,
            "mobile": f"987654{formatted_abha[-4:] if len(formatted_abha) >= 4 else '1234'}",
            "state": "Maharashtra",
            "district": "Pune",
            "auth_mode": txn_record.get("auth_mode", "MOBILE_OTP"),
            "verification_timestamp": datetime.now(timezone.utc),
            "gateway_mode": "simulation",
            "message": "ABHA identity successfully authenticated via High-Availability Simulated Gateway.",
        }

    async def verify_abha(self, abha_identifier: str) -> dict[str, Any]:
        """
        Immediate verification lookup for an ABHA identifier.
        """
        clean_id = abha_identifier.strip()
        is_address = "@" in clean_id

        if is_address:
            formatted_abha = "91-4521-8890-1234"
            abha_address = clean_id
            name = clean_id.split("@")[0].replace(".", " ").title()
        else:
            raw_digits = re.sub(r"\D", "", clean_id)
            if len(raw_digits) == 14:
                formatted_abha = f"{raw_digits[:2]}-{raw_digits[2:6]}-{raw_digits[6:10]}-{raw_digits[10:14]}"
            else:
                formatted_abha = "91-4521-8890-1234"
            abha_address = f"patient.{raw_digits[:6] if raw_digits else 'demo'}@abdm"
            name = "Ananya Sharma"

        return {
            "status": "VERIFIED",
            "abha_number": formatted_abha,
            "abha_address": abha_address,
            "patient_name": name,
            "gender": "F",
            "year_of_birth": 1992,
            "mobile": "******4892",
            "state": "Maharashtra",
            "district": "Pune",
            "verification_timestamp": datetime.now(timezone.utc),
            "gateway_mode": "simulation",
            "message": "ABHA identity successfully authenticated via ABDM Simulated Gateway.",
        }

    async def push_hip_health_data(
        self, bundle: dict[str, Any], care_context_id: str
    ) -> dict[str, Any]:
        """
        Simulates instantaneous (<50ms) HIP bundle transfer to ABDM network.
        """
        await asyncio.sleep(0.02)
        tx_id = f"TX-ABDM-SIM-{uuid.uuid4().hex[:8].upper()}"
        bundle_id = bundle.get("id") or f"BUNDLE-{uuid.uuid4().hex[:8].upper()}"
        transfer_id = f"TRF-{uuid.uuid4().hex[:6].upper()}"

        return {
            "transaction_id": tx_id,
            "status": "TRANSFERRED",
            "care_context_id": care_context_id,
            "transfer_id": transfer_id,
            "bundle_id": bundle_id,
            "recipient_hip_id": self.hip_id,
            "facility_id": self.facility_id,
            "gateway_mode": "simulation",
            "message": f"NRCES FHIR R4 Bundle #{bundle_id} successfully pushed to ABDM HIP Network (Tx #{tx_id}).",
        }

    async def check_gateway_health(self) -> dict[str, Any]:
        """
        Returns instantaneous simulated health status.
        """
        return {
            "status": "ONLINE",
            "gateway_mode": "simulation",
            "base_url": "simulation://internal-sandbox",
            "is_authenticated": True,
            "active_facility_id": self.facility_id,
            "hip_id": self.hip_id,
            "ping_latency_ms": 1.2,
        }
