"""initial_schema

Revision ID: 2c1db709b90d
Revises: 
Create Date: 2026-08-30 21:02:23.984919

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c1db709b90d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. hospitals
    op.create_table(
        'hospitals',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('address', sa.String(), nullable=True),
        sa.Column('city', sa.String(), nullable=True),
        sa.Column('state', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_hospitals_code'), 'hospitals', ['code'], unique=True)

    # 2. departments
    op.create_table(
        'departments',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('hospital_id', sa.String(), sa.ForeignKey('hospitals.id'), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('code', sa.String(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_departments_hospital_id'), 'departments', ['hospital_id'], unique=False)

    # 3. users
    op.create_table(
        'users',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('auth_provider_id', sa.String(), nullable=True),
        sa.Column('role', sa.String(), server_default='PATIENT', nullable=False),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_users_auth_provider_id'), 'users', ['auth_provider_id'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 4. doctors
    op.create_table(
        'doctors',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('hospital_id', sa.String(), sa.ForeignKey('hospitals.id'), nullable=False),
        sa.Column('department_id', sa.String(), sa.ForeignKey('departments.id'), nullable=True),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('specialization', sa.String(), nullable=False),
        sa.Column('license_identifier', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_doctors_hospital_id'), 'doctors', ['hospital_id'], unique=False)
    op.create_index(op.f('ix_doctors_department_id'), 'doctors', ['department_id'], unique=False)

    # 5. patients
    op.create_table(
        'patients',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('user_id', sa.String(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('display_name', sa.String(), nullable=False),
        sa.Column('date_of_birth', sa.String(), nullable=True),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('gender', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('abha_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_patients_abha_id'), 'patients', ['abha_id'], unique=True)

    # 6. intake_sessions
    op.create_table(
        'intake_sessions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('token', sa.String(), nullable=False),
        sa.Column('patient_id', sa.String(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('hospital_id', sa.String(), sa.ForeignKey('hospitals.id'), nullable=False),
        sa.Column('doctor_id', sa.String(), sa.ForeignKey('doctors.id'), nullable=False),
        sa.Column('workflow_type', sa.String(), server_default='GENERAL_CLINICAL', nullable=True),
        sa.Column('interaction_mode', sa.String(), server_default='VOICE', nullable=True),
        sa.Column('language_code', sa.String(), server_default='en', nullable=True),
        sa.Column('status', sa.String(), server_default='ACTIVE', nullable=True),
        sa.Column('current_question_index', sa.Integer(), server_default='0', nullable=True),
        sa.Column('question_count', sa.Integer(), server_default='0', nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_intake_sessions_token'), 'intake_sessions', ['token'], unique=True)
    op.create_index(op.f('ix_intake_sessions_patient_id'), 'intake_sessions', ['patient_id'], unique=False)
    op.create_index(op.f('ix_intake_sessions_hospital_id'), 'intake_sessions', ['hospital_id'], unique=False)
    op.create_index(op.f('ix_intake_sessions_doctor_id'), 'intake_sessions', ['doctor_id'], unique=False)
    op.create_index(op.f('ix_intake_sessions_status'), 'intake_sessions', ['status'], unique=False)
    op.create_index(op.f('ix_intake_sessions_submitted_at'), 'intake_sessions', ['submitted_at'], unique=False)

    # 7. question_events
    op.create_table(
        'question_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('sequence_number', sa.Integer(), nullable=False),
        sa.Column('question_text', sa.String(), nullable=False),
        sa.Column('target_field', sa.String(), nullable=False),
        sa.Column('decision_action', sa.String(), server_default='ASK', nullable=True),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_question_events_intake_session_id'), 'question_events', ['intake_session_id'], unique=False)

    # 8. answers
    op.create_table(
        'answers',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('question_event_id', sa.String(), sa.ForeignKey('question_events.id'), nullable=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('raw_text', sa.Text(), nullable=False),
        sa.Column('normalized_text', sa.Text(), nullable=True),
        sa.Column('input_mode', sa.String(), server_default='VOICE', nullable=True),
        sa.Column('language_code', sa.String(), server_default='en', nullable=True),
        sa.Column('audio_duration_seconds', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_answers_intake_session_id'), 'answers', ['intake_session_id'], unique=False)

    # 9. clinical_states
    op.create_table(
        'clinical_states',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=True),
        sa.Column('state_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_clinical_states_intake_session_id'), 'clinical_states', ['intake_session_id'], unique=False)

    # 10. documents
    op.create_table(
        'documents',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('patient_id', sa.String(), sa.ForeignKey('patients.id'), nullable=False),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=True),
        sa.Column('file_name', sa.String(), nullable=False),
        sa.Column('storage_object_id', sa.String(), nullable=False),
        sa.Column('mime_type', sa.String(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('file_hash', sa.String(), nullable=True),
        sa.Column('document_type', sa.String(), server_default='PRESCRIPTION', nullable=True),
        sa.Column('status', sa.String(), server_default='PENDING', nullable=True),
        sa.Column('uploaded_at', sa.DateTime(), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_documents_patient_id'), 'documents', ['patient_id'], unique=False)
    op.create_index(op.f('ix_documents_intake_session_id'), 'documents', ['intake_session_id'], unique=False)

    # 11. document_extractions
    op.create_table(
        'document_extractions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('document_id', sa.String(), sa.ForeignKey('documents.id'), nullable=False),
        sa.Column('field_type', sa.String(), nullable=False),
        sa.Column('field_name', sa.String(), nullable=False),
        sa.Column('value_json', sa.JSON(), nullable=False),
        sa.Column('confidence', sa.Integer(), server_default='90', nullable=True),
        sa.Column('source_page', sa.Integer(), server_default='1', nullable=True),
        sa.Column('status', sa.String(), server_default='NEEDS_REVIEW', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_document_extractions_document_id'), 'document_extractions', ['document_id'], unique=False)

    # 12. red_flags
    op.create_table(
        'red_flags',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('rule_id', sa.String(), nullable=False),
        sa.Column('title', sa.String(), nullable=False),
        sa.Column('reason', sa.String(), nullable=False),
        sa.Column('severity', sa.String(), server_default='PRIORITY', nullable=True),
        sa.Column('evidence_json', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(), server_default='OPEN', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_red_flags_intake_session_id'), 'red_flags', ['intake_session_id'], unique=False)

    # 13. contradictions
    op.create_table(
        'contradictions',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('field_name', sa.String(), nullable=False),
        sa.Column('value_a_json', sa.JSON(), nullable=False),
        sa.Column('source_a_json', sa.JSON(), nullable=False),
        sa.Column('value_b_json', sa.JSON(), nullable=False),
        sa.Column('source_b_json', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(), server_default='OPEN', nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_contradictions_intake_session_id'), 'contradictions', ['intake_session_id'], unique=False)

    # 14. physician_reviews
    op.create_table(
        'physician_reviews',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('intake_session_id', sa.String(), sa.ForeignKey('intake_sessions.id'), nullable=False),
        sa.Column('doctor_id', sa.String(), sa.ForeignKey('doctors.id'), nullable=False),
        sa.Column('status', sa.String(), server_default='NOT_REVIEWED', nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_physician_reviews_intake_session_id'), 'physician_reviews', ['intake_session_id'], unique=True)
    op.create_index(op.f('ix_physician_reviews_doctor_id'), 'physician_reviews', ['doctor_id'], unique=False)

    # 15. physician_edits
    op.create_table(
        'physician_edits',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('physician_review_id', sa.String(), sa.ForeignKey('physician_reviews.id'), nullable=False),
        sa.Column('field_name', sa.String(), nullable=False),
        sa.Column('old_value_json', sa.JSON(), nullable=True),
        sa.Column('new_value_json', sa.JSON(), nullable=True),
        sa.Column('reason', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_physician_edits_physician_review_id'), 'physician_edits', ['physician_review_id'], unique=False)

    # 16. audit_events
    op.create_table(
        'audit_events',
        sa.Column('id', sa.String(), primary_key=True),
        sa.Column('actor_user_id', sa.String(), nullable=True),
        sa.Column('actor_role', sa.String(), server_default='SYSTEM', nullable=True),
        sa.Column('event_type', sa.String(), nullable=False),
        sa.Column('resource_type', sa.String(), nullable=False),
        sa.Column('resource_id', sa.String(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index(op.f('ix_audit_events_event_type'), 'audit_events', ['event_type'], unique=False)
    op.create_index(op.f('ix_audit_events_created_at'), 'audit_events', ['created_at'], unique=False)


def downgrade() -> None:
    op.drop_table('audit_events')
    op.drop_table('physician_edits')
    op.drop_table('physician_reviews')
    op.drop_table('contradictions')
    op.drop_table('red_flags')
    op.drop_table('document_extractions')
    op.drop_table('documents')
    op.drop_table('clinical_states')
    op.drop_table('answers')
    op.drop_table('question_events')
    op.drop_table('intake_sessions')
    op.drop_table('patients')
    op.drop_table('doctors')
    op.drop_table('users')
    op.drop_table('departments')
    op.drop_table('hospitals')
