import { en, type TranslationKey } from './en';

export const hi: Record<TranslationKey, string> = {
  // Navigation & General
  brandName: 'स्वास्थ्यवाणी',
  tagline: 'स्वास्थ्य सेवा, समझ के साथ',
  back: 'वापस जाएं',
  continue: 'आगे बढ़ें',
  saveChanges: 'बदलाव सहेजें',
  cancel: 'रद्द करें',
  confirm: 'पुष्टि करें',
  edit: 'संपादित करें',
  skip: 'अभी छोड़ें',
  privateAndSecure: 'निजी और सुरक्षित',
  needHelp: 'मदद चाहिए? पास के स्टाफ सदस्य से पूछें।',
  demoNotice: 'डेमो मरीज प्रोफ़ाइल · विवरण स्थानीय रूप से सहेजे गए हैं',
  
  // Patient Home
  homeTitle: 'स्वास्थ्यवाणी में आपका स्वागत है',
  homeSubtitle: 'आपकी स्वास्थ्य बातचीत यहाँ से शुरू होती है।',
  homeDescription: 'आप कैसा महसूस कर रहे हैं, इसके बारे में कुछ सरल प्रश्नों के उत्तर दें। आपके उत्तर आपके डॉक्टर के लिए परामर्श जानकारी तैयार करने में मदद करेंगे।',
  startConsultation: 'परामर्श शुरू करें',
  viewProfile: 'मेरी प्रोफ़ाइल',
  selectLanguage: 'भाषा',
  
  // Patient Profile
  profileTitle: 'मेरी प्रोफ़ाइल',
  patientRegistrationTitle: 'मरीज की जानकारी',
  patientRegistrationSubtitle: 'अपनी परामर्श प्रोफ़ाइल बनाने के लिए कृपया अपना विवरण दर्ज करें।',
  nameLabel: 'पूरा नाम',
  ageLabel: 'आयु (वर्षों में)',
  genderLabel: 'लिंग',
  abhaNumberLabel: 'आभा कार्ड / नंबर (वैकल्पिक)',
  phoneLabel: 'मोबाइल नंबर (वैकल्पिक)',
  preferredLanguageLabel: 'पसंदीदा भाषा',
  patientNameVal: 'Patient Name',
  patientAgeVal: '21',
  patientGenderVal: 'निर्दिष्ट नहीं है',
  editProfile: 'प्रोफ़ाइल संपादित करें',
  saveProfile: 'प्रोफ़ाइल सहेजें',
  createProfileAndContinue: 'विवरण सहेजें और प्रश्नों पर आगे बढ़ें',

  // Consultation / Intake
  stepLanguage: 'भाषा',
  stepDetails: 'आपकी जानकारी',
  stepStory: 'आपकी स्थिति',
  stepRecords: 'दस्तावेज़',
  stepReview: 'समीक्षा',
  chooseLanguageTitle: 'आप किस भाषा का उपयोग करना चाहेंगे?',
  chooseLanguageSubtitle: 'आप इसे किसी भी समय बदल सकते हैं।',
  
  questionProgress: 'प्रश्न {current} / {total}',
  typeAnswerPlaceholder: 'अपना उत्तर यहाँ लिखें...',
  yourAnswerLabel: 'आपका उत्तर',
  validationEmpty: 'आगे बढ़ने से पहले कृपया अपना उत्तर दर्ज करें।',
  previousQuestion: 'पिछला',
  nextQuestion: 'आगे बढ़ें',
  finishQuestions: 'उत्तरों की समीक्षा करें',

  // Records step
  recordsTitle: 'क्या आपके पास कोई पुराना पर्चा या रिपोर्ट है?',
  recordsSubtitle: 'यह आपके डॉक्टर को पूरी स्थिति समझने में मदद करता है।',
  recordsOptional: 'सहायक है, पर अनिवार्य नहीं',
  uploadFromDevice: 'डिवाइस से अपलोड करें',
  takePhoto: 'फोटो खींचें',
  uploadFormats: 'PDF, JPG या PNG',
  noPrescriptionButton: 'मेरे पास कोई पर्चा / रिपोर्ट नहीं है',
  continueWithoutReport: 'बिना रिपोर्ट के आगे बढ़ें',
  continueWithReport: 'आगे बढ़ें',

  // Patient Review
  reviewTitle: 'अपने उत्तरों की समीक्षा करें',
  reviewSubtitle: 'कृपया डॉक्टर के साथ साझा करने से पहले अपने उत्तरों की पुष्टि करें।',
  editAnswers: 'उत्तर संपादित करें',
  confirmAndSubmit: 'पुष्टि करें',
  submissionSuccessTitle: 'परामर्श जानकारी पूर्ण हुई',
  submissionSuccessSubtitle: 'आपकी जानकारी डॉक्टर की समीक्षा के लिए तैयार है।',
  returnHome: 'होम पर वापस जाएं',

  // Common Errors & Alerts
  genericError: 'कुछ गलत हो गया। कृपया पुन: प्रयास करें।',
  requiredField: 'यह फ़ील्ड आवश्यक है।',
};
