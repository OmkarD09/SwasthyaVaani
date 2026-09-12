import { Route, Switch, useLocation } from 'wouter';
import { HomePage } from './pages/HomePage';
import { PatientLanguageSelection } from './pages/PatientLanguageSelection';
import { PatientDetails } from './pages/PatientDetails';
import { PatientDepartmentSelection } from './pages/PatientDepartmentSelection';
import { PatientModeSelection } from './pages/PatientModeSelection';
import { PatientIntake } from './pages/PatientIntake';
import { PatientReviewSummary } from './pages/PatientReviewSummary';
import { PatientComplete } from './pages/PatientComplete';
import { PatientProfile } from './pages/PatientProfile';
import { ClinicianLogin } from './pages/ClinicianLogin';
import { DoctorPatientReview } from './pages/DoctorPatientReview';
import { DoctorPatientSummary } from './pages/DoctorPatientSummary';
import { DoctorPatientConversation } from './pages/DoctorPatientConversation';
import { DoctorPatientAyush } from './pages/DoctorPatientAyush';
import { DoctorPatientHistory } from './pages/DoctorPatientHistory';
import { DoctorPortal } from './pages/DoctorPortal';
import { HospitalOperations } from './pages/HospitalOperations';
import { AdminRouteGuard } from './components/admin/AdminRouteGuard';
import NotFound from './pages/not-found';
import { Toaster } from './components/ui/toaster';
import { useKioskIdleTimer } from './hooks/useKioskIdleTimer';
import { KioskInactivityModal } from './components/patient/KioskInactivityModal';
import { getStoredLanguage } from './lib/kioskState';

function KioskInactivityWatcher() {
  const [location, setLocation] = useLocation();

  // Active kiosk intake routes where patient personal data is being entered
  const isKioskIntakeActive =
    location.startsWith('/patient') &&
    location !== '/patient' &&
    location !== '/patient/language' &&
    location !== '/patient/complete';

  const handleTimeout = () => {
    setLocation('/patient/language');
  };

  const { isIdleWarning, countdownSeconds, resetTimer, cancelAndPurge } = useKioskIdleTimer({
    idleTimeoutMs: 60000,
    countdownDurationSec: 15,
    enabled: isKioskIntakeActive,
    onTimeout: handleTimeout,
  });

  const language = getStoredLanguage() || 'English';

  return (
    <KioskInactivityModal
      isOpen={isIdleWarning && isKioskIntakeActive}
      countdownSeconds={countdownSeconds}
      onContinue={resetTimer}
      onCancel={() => {
        cancelAndPurge('USER_CANCELLED');
        setLocation('/patient/language');
      }}
      language={language}
    />
  );
}

function ProtectedAdmin() {
  return (
    <AdminRouteGuard>
      <HospitalOperations />
    </AdminRouteGuard>
  );
}

function Router() {
  return (
    <Switch>
      {/* Staff, Clinician & Admin Portal Login */}
      <Route path="/admin/login" component={ClinicianLogin} />
      <Route path="/clinician/login" component={ClinicianLogin} />
      <Route path="/staff/login" component={ClinicianLogin} />
      <Route path="/doctor/login" component={ClinicianLogin} />

      {/* Doctor Workstation */}
      <Route path="/doctor/reviewed" component={DoctorPortal} />
      <Route path="/doctor" component={DoctorPortal} />
      <Route path="/doctor/patient/:id/history" component={DoctorPatientHistory} />
      <Route path="/doctor/patient/:id/conversation" component={DoctorPatientConversation} />
      <Route path="/doctor/patient/:id/summary" component={DoctorPatientSummary} />
      <Route path="/doctor/patient/:id/ayush" component={DoctorPatientAyush} />
      <Route path="/doctor/patient/:id" component={DoctorPatientReview} />

      {/* Protected Admin Routes */}
      <Route path="/admin" component={ProtectedAdmin} />
      <Route path="/admin/dashboard" component={ProtectedAdmin} />
      <Route path="/admin/ai-monitoring" component={ProtectedAdmin} />
      <Route path="/admin/emergency" component={ProtectedAdmin} />
      <Route path="/admin/audit" component={ProtectedAdmin} />
      <Route path="/admin/onboarding" component={ProtectedAdmin} />
      <Route path="/admin/qa" component={ProtectedAdmin} />

      {/* Public Landing */}
      <Route path="/" component={HomePage} />

      {/* Patient Intake Flow */}
      <Route path="/patient" component={PatientLanguageSelection} />
      <Route path="/patient/language" component={PatientLanguageSelection} />
      <Route path="/patient/details" component={PatientDetails} />
      <Route path="/patient/details-form" component={PatientDetails} />
      <Route path="/patient/department" component={PatientDepartmentSelection} />
      <Route path="/patient/mode" component={PatientModeSelection} />
      <Route path="/patient/intake" component={PatientIntake} />
      <Route path="/patient/review" component={PatientReviewSummary} />
      <Route path="/patient/review-summary" component={PatientReviewSummary} />
      <Route path="/patient/complete" component={PatientComplete} />
      <Route path="/patient/profile" component={PatientProfile} />
      <Route path="/patient/info" component={PatientProfile} />

      {/* 404 Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <>
      <Router />
      <KioskInactivityWatcher />
      <Toaster />
    </>
  );
}

export default App;