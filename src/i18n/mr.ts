import { en, type TranslationKey } from './en';

export const mr: Record<TranslationKey, string> = {
  // Navigation & General
  brandName: 'स्वास्थ्यवाणी',
  tagline: 'आरोग्य सेवा, समजून घेतलेली',
  back: 'मागे जा',
  continue: 'पुढे जा',
  saveChanges: 'बदल जतन करा',
  cancel: 'रद्द करा',
  confirm: 'पुष्टी करा',
  edit: 'संपादित करा',
  skip: 'आत्ता वगळा',
  privateAndSecure: 'खाजगी आणि सुरक्षित',
  needHelp: 'मदत हवी आहे? जवळच्या कर्मचाऱ्याशी संपर्क साधा.',
  demoNotice: 'डेमो रुग्ण प्रोफाइल · माहिती स्थानिक पातळीवर जतन केली आहे',
  
  // Patient Home
  homeTitle: 'स्वास्थ्यवाणीमध्ये आपले स्वागत आहे',
  homeSubtitle: 'तुमची आरोग्यविषयक चर्चा येथून सुरू होते.',
  homeDescription: 'तुम्हाला कसे वाटत आहे याबद्दल काही सोप्या प्रश्नांची उत्तरे द्या. तुमची उत्तरे तुमच्या डॉक्टरांसाठी माहिती तयार करण्यात मदत करतील.',
  startConsultation: 'सल्लामसलत सुरू करा',
  viewProfile: 'माझे प्रोफाइल',
  selectLanguage: 'भाषा',
  
  // Patient Profile
  profileTitle: 'माझे प्रोफाइल',
  patientRegistrationTitle: 'रुग्णाची माहिती',
  patientRegistrationSubtitle: 'आपले प्रोफाइल तयार करण्यासाठी कृपया आपली प्राथमिक माहिती प्रविष्ट करा.',
  nameLabel: 'पूर्ण नाव',
  ageLabel: 'वय (वर्षे)',
  genderLabel: 'लिंग',
  abhaNumberLabel: 'आभा कार्ड / क्रमांक (ऐच्छिक)',
  phoneLabel: 'मोबाईल क्रमांक (ऐच्छिक)',
  preferredLanguageLabel: 'पसंतीची भाषा',
  patientNameVal: 'Patient Name',
  patientAgeVal: '21',
  patientGenderVal: 'नोंदवलेले नाही',
  editProfile: 'प्रोफाइल संपादित करा',
  saveProfile: 'प्रोफाइल जतन करा',
  createProfileAndContinue: 'माहिती जतन करा आणि प्रश्नांवर पुढे जा',

  // Consultation / Intake
  stepLanguage: 'भाषा',
  stepDetails: 'आपली माहिती',
  stepStory: 'तुमची माहिती',
  stepRecords: 'कागदपत्रे',
  stepReview: 'पुनरावलोकन',
  chooseLanguageTitle: 'तुम्ही कोणती भाषा वापरू इच्छिता?',
  chooseLanguageSubtitle: 'तुम्ही हे कधीही बदलू शकता.',
  
  questionProgress: 'प्रश्न {current} / {total}',
  typeAnswerPlaceholder: 'तुमचे उत्तर येथे लिहा...',
  yourAnswerLabel: 'तुमचे उत्तर',
  validationEmpty: 'पुढे जाण्यापूर्वी कृपया उत्तर प्रविष्ट करा.',
  previousQuestion: 'मागील',
  nextQuestion: 'पुढे',
  finishQuestions: 'उत्तरांचे पुनरावलोकन करा',

  // Records step
  recordsTitle: 'तुमच्याकडे जुनी प्रिस्क्रिप्शन किंवा रिपोर्ट आहे का?',
  recordsSubtitle: 'यामुळे डॉक्टरांना पूर्ण पार्श्वभूमी समजण्यास मदत होते.',
  recordsOptional: 'मदतनीस, पण अनिवार्य नाही',
  uploadFromDevice: 'डिव्हाइसवरून अपलोड करा',
  takePhoto: 'फोटो काढा',
  uploadFormats: 'PDF, JPG किंवा PNG',
  noPrescriptionButton: 'माझ्याकडे प्रिस्क्रिप्शन / रिपोर्ट नाही',
  continueWithoutReport: 'रिपोर्टशिवाय पुढे जा',
  continueWithReport: 'पुढे जा',

  // Patient Review
  reviewTitle: 'तुमच्या उत्तरांचे पुनरावलोकन करा',
  reviewSubtitle: 'कृपया डॉक्टरांकडे पाठवण्यापूर्वी तुमच्या उत्तरांची खात्री करा.',
  editAnswers: 'उत्तरे संपादित करा',
  confirmAndSubmit: 'पुष्टी करा',
  submissionSuccessTitle: 'माहिती नोंदणी पूर्ण झाली',
  submissionSuccessSubtitle: 'तुमची माहिती डॉक्टरांच्या तपासणीसाठी तयार आहे.',
  returnHome: 'मुख्य पृष्ठावर परत जा',

  // Common Errors & Alerts
  genericError: 'काहीतरी त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
  requiredField: 'हे भरणे आवश्यक आहे.',
};
