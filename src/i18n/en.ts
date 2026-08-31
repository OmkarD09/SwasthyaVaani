export const en = {
  // Navigation & General
  brandName: 'SwasthyaVaani',
  tagline: 'Care, Understood',
  back: 'Back',
  continue: 'Continue',
  saveChanges: 'Save Changes',
  cancel: 'Cancel',
  confirm: 'Confirm',
  edit: 'Edit',
  skip: 'Skip for now',
  privateAndSecure: 'Private & Secure',
  needHelp: 'Need help? Ask a staff member nearby.',
  demoNotice: 'Demo patient profile · Updates stored locally',
  
  // Patient Home
  homeTitle: 'Welcome to SwasthyaVaani',
  homeSubtitle: 'Your health conversation starts here.',
  homeDescription: 'Answer a few simple questions about how you are feeling. Your answers will help create your consultation information.',
  startConsultation: 'Start Consultation',
  viewProfile: 'My Profile',
  selectLanguage: 'Language',
  
  // Patient Profile
  profileTitle: 'My Profile',
  patientRegistrationTitle: 'Patient Information',
  patientRegistrationSubtitle: 'Please enter your basic details to create your intake profile.',
  nameLabel: 'Full Name',
  ageLabel: 'Age (in years)',
  genderLabel: 'Gender',
  abhaNumberLabel: 'ABHA Card / Number (Optional)',
  phoneLabel: 'Phone Number (Optional)',
  preferredLanguageLabel: 'Preferred Language',
  patientNameVal: 'Patient Name',
  patientAgeVal: '21',
  patientGenderVal: 'Not specified',
  editProfile: 'Edit Profile',
  saveProfile: 'Save Profile',
  createProfileAndContinue: 'Save Details & Continue to Questions',

  // Consultation / Intake
  stepLanguage: 'Language',
  stepDetails: 'Your Details',
  stepStory: 'Your story',
  stepRecords: 'Records',
  stepReview: 'Review',
  chooseLanguageTitle: 'Which language would you like to use?',
  chooseLanguageSubtitle: 'You can change this at any time.',
  
  questionProgress: 'Question {current} of {total}',
  typeAnswerPlaceholder: 'Type your answer here...',
  yourAnswerLabel: 'Your answer',
  validationEmpty: 'Please enter an answer before continuing.',
  previousQuestion: 'Previous',
  nextQuestion: 'Next',
  finishQuestions: 'Review Answers',

  // Records step
  recordsTitle: 'Do you have an old prescription or report?',
  recordsSubtitle: 'It helps your doctor see the full picture.',
  recordsOptional: 'Helpful, not required',
  uploadFromDevice: 'Upload from device',
  takePhoto: 'Take a photo',
  uploadFormats: 'PDF, JPG or PNG',
  noPrescriptionButton: 'I don’t have a prescription / report',
  continueWithoutReport: 'Continue without a report',
  continueWithReport: 'Continue',

  // Patient Review
  reviewTitle: 'Review Your Answers',
  reviewSubtitle: 'Please verify your answers before sharing them with your doctor.',
  editAnswers: 'Edit Answers',
  confirmAndSubmit: 'Confirm',
  submissionSuccessTitle: 'Intake Completed',
  submissionSuccessSubtitle: 'Your story is ready for your doctor to review.',
  returnHome: 'Return to Home',

  // Common Errors & Alerts
  genericError: 'Something went wrong. Please try again.',
  requiredField: 'This field is required.',
};

export type LanguageCode = 'en' | 'hi' | 'mr';
export type TranslationKey = keyof typeof en;
