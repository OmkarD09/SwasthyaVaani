import { Route, Switch } from 'wouter';
import { HomePage } from './pages/HomePage';
import { PatientLanguageSelection } from './pages/PatientLanguageSelection';
import { PatientDetails } from './pages/PatientDetails';
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
import { DoctorPortal } from './pages/DoctorPortal';
import { HospitalOperations } from './pages/HospitalOperations';
import NotFound from './pages/not-found';
import { Toaster } from './components/ui/toaster';

function Router() {
  return (
    <Switch>
      {/* Staff & Clinician Portal */}
      <Route path="/clinician/login" component={ClinicianLogin} />
      <Route path="/staff/login" component={ClinicianLogin} />
      <Route path="/doctor/login" component={ClinicianLogin} />
      <Route path="/doctor" component={DoctorPortal} />
      <Route path="/doctor/patient/:id/conversation" component={DoctorPatientConversation} />
      <Route path="/doctor/patient/:id/summary" component={DoctorPatientSummary} />
      <Route path="/doctor/patient/:id/ayush" component={DoctorPatientAyush} />
      <Route path="/doctor/patient/:id" component={DoctorPatientReview} />
      <Route path="/admin" component={HospitalOperations} />
      <Route path="/admin/dashboard" component={HospitalOperations} />

      {/* Public Landing */}
      <Route path="/" component={HomePage} />

      {/* Patient Intake Flow */}
      <Route path="/patient" component={PatientLanguageSelection} />
      <Route path="/patient/language" component={PatientLanguageSelection} />
      <Route path="/patient/details" component={PatientDetails} />
      <Route path="/patient/details-form" component={PatientDetails} />
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
      <Toaster />
    </>
  );
}

export default App;