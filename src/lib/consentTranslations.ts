export interface ConsentTranslation {
  kicker: string;
  title: string;
  subtitle: string;
  audioGuideTitle: string;
  audioGuideSubtitle: string;
  spokenScript: string;
  bulletPoints: Array<{
    title: string;
    description: string;
  }>;
  checkboxLabel: string;
  btnAgree: string;
  btnChangeLanguage: string;
  audioStatusPlaying: string;
  audioStatusPaused: string;
  audioStatusCompleted: string;
  audioStatusReady: string;
  speechUnavailableNotice: string;
}

export const CONSENT_TRANSLATIONS: Record<string, ConsentTranslation> = {
  English: {
    kicker: 'STEP 01 OF 05 · PATIENT CONSENT',
    title: 'Audio-Guided Consent',
    subtitle: 'Please listen to the short audio guide or read the clinical data processing terms below.',
    audioGuideTitle: 'Voice & Data Consent Guide',
    audioGuideSubtitle: 'Listen in English (15 seconds)',
    spokenScript:
      'Welcome to SwasthyaVaani. By proceeding, you agree that your voice responses, health details, and uploaded medical documents will be processed by our AI system to assist your doctor. Your doctor will review all information before making any clinical decisions.',
    bulletPoints: [
      {
        title: 'Voice & Symptom Processing',
        description: 'Your spoken words and typed answers are converted into a clinical summary for your doctor.',
      },
      {
        title: 'Medical Records OCR',
        description: 'Uploaded prescriptions and lab reports are digitized to help your doctor view prior history.',
      },
      {
        title: 'Doctor-in-the-Loop Safety',
        description: 'AI assists with history intake only. Your physician confirms all diagnoses and treatments.',
      },
      {
        title: 'ABDM Privacy Standards',
        description: 'Your medical information is kept secure and handled in accordance with Indian digital health standards.',
      },
    ],
    checkboxLabel: 'I understand and agree to data processing for my clinical consultation.',
    btnAgree: 'I Agree & Continue',
    btnChangeLanguage: 'Change Language',
    audioStatusPlaying: 'Playing consent guide...',
    audioStatusPaused: 'Audio paused. Press play to resume.',
    audioStatusCompleted: 'Audio playback finished.',
    audioStatusReady: 'Press Play to listen in English.',
    speechUnavailableNotice: 'Audio speech is simulated or read aloud using browser voice.',
  },

  'हिन्दी': {
    kicker: 'चरण ०१ / ०५ · रोगी सहमति',
    title: 'ऑडियो-निर्देशित सहमति',
    subtitle: 'कृपया छोटा ऑडियो गाइड सुनें या नीचे दिए गए डेटा उपयोग की शर्तों को पढ़ें।',
    audioGuideTitle: 'आवाज़ और डेटा सहमति गाइड',
    audioGuideSubtitle: 'हिन्दी में सुनें (१५ सेकंड)',
    spokenScript:
      'स्वास्थ्यवाणी में आपका स्वागत है। आगे बढ़कर, आप सहमति देते हैं कि आपके आवाज़ के जवाब, स्वास्थ्य विवरण और अपलोड किए गए मेडिकल दस्तावेज़ डॉक्टर की सहायता के लिए हमारे एआई सिस्टम द्वारा संसाधित किए जाएंगे। आपके डॉक्टर किसी भी चिकित्सीय निर्णय से पहले सभी जानकारी की समीक्षा करेंगे।',
    bulletPoints: [
      {
        title: 'आवाज़ और लक्षणों का विश्लेषण',
        description: 'आपकी आवाज़ और उत्तरों को डॉक्टर के लिए एक संक्षिप्त मेडिकल सारांश में बदला जाता है।',
      },
      {
        title: 'दस्तावेज़ और पर्चे की स्कैनिंग',
        description: 'पुराने पर्चे और टेस्ट रिपोर्ट डॉक्टर को दिखाने के लिए डिजिटल रूप में पढ़े जाते हैं।',
      },
      {
        title: 'डॉक्टर की पुष्टि और सुरक्षा',
        description: 'एआई केवल जानकारी जुटाने में मदद करता है। अंतिम इलाज और निर्णय आपके डॉक्टर ही लेंगे।',
      },
      {
        title: 'डेटा गोपनीयता और सुरक्षा',
        description: 'आपकी स्वास्थ्य जानकारी पूरी तरह गोपनीय और सुरक्षित रखी जाती है।',
      },
    ],
    checkboxLabel: 'मैं समझता/समझती हूँ और अपनी चिकित्सीय परामर्श के लिए डेटा उपयोग की सहमति देता/देती हूँ।',
    btnAgree: 'सहमति दें और आगे बढ़ें',
    btnChangeLanguage: 'भाषा बदलें',
    audioStatusPlaying: 'सहमति गाइड बज रहा है...',
    audioStatusPaused: 'ऑडियो रुका हुआ है। जारी रखने के लिए प्ले दबाएं।',
    audioStatusCompleted: 'ऑडियो पूरा हुआ।',
    audioStatusReady: 'हिन्दी में सुनने के लिए प्ले दबाएं।',
    speechUnavailableNotice: 'ब्राउज़र आवाज़ द्वारा ऑडियो गाइड बोला जा रहा है।',
  },

  'मराठी': {
    kicker: 'टप्पा ०१ / ०५ · रुग्ण संमती',
    title: 'ऑडिओ-मार्गदर्शित संमती',
    subtitle: 'कृपया मार्गदर्शक ऑडिओ ऐका किंवा खाली दिलेल्या डेटा प्रक्रिया अटी वाचा.',
    audioGuideTitle: 'आवाज आणि डेटा संमती मार्गदर्शक',
    audioGuideSubtitle: 'मराठीत ऐका (१५ सेकंद)',
    spokenScript:
      'स्वास्थ्यवाणीमध्ये आपले स्वागत आहे. पुढे जाऊन, आपण संमती देता की आपले आवाजातील प्रतिसाद, आरोग्य माहिती आणि अपलोड केलेले वैद्यकीय अहवाल डॉक्टरांच्या मदतीसाठी एआय द्वारे विश्लेषित केले जातील. आपले डॉक्टर कोणत्याही उपचारापूर्वी सर्व माहिती तपासतील.',
    bulletPoints: [
      {
        title: 'आवाज आणि लक्षणे विश्लेषण',
        description: 'आपले बोलणे आणि माहिती डॉक्टरांसाठी सारांश तयार करण्यासाठी वापरली जाते.',
      },
      {
        title: 'वैद्यकीय कागदपत्रे स्कॅनिंग',
        description: 'जुनी प्रिस्क्रिप्शन आणि लॅब रिपोर्ट्स डिजिटल स्वरूपात वाचले जातात.',
      },
      {
        title: 'डॉक्टरांचा अंतिम निर्णय',
        description: 'एआय फक्त माहिती गोळा करतो. अंतिम निदान आणि उपचार डॉक्टरच करतात.',
      },
      {
        title: 'डेटा गोपनीयता व सुरक्षा',
        description: 'आपली माहिती पूर्णपणे सुरक्षित आणि गोपनीय ठेवली जाते.',
      },
    ],
    checkboxLabel: 'मला मान्य आहे आणि मी वैद्यकीय सल्लामसलतीसाठी डेटा प्रक्रियेस संमती देतो/देते.',
    btnAgree: 'संमती द्या आणि पुढे जा',
    btnChangeLanguage: 'भाषा बदला',
    audioStatusPlaying: 'संमती ऑडिओ वाजत आहे...',
    audioStatusPaused: 'ऑडिओ थांबवला आहे.',
    audioStatusCompleted: 'ऑडिओ पूर्ण झाला.',
    audioStatusReady: 'मराठीत ऐकण्यासाठी प्ले दाबा.',
    speechUnavailableNotice: 'ब्राउझर व्हॉइसद्वारे ऑडिओ वाचला जात आहे.',
  },

  'বাংলা': {
    kicker: 'ধাপ ০১ / ০৫ · রোগীর সম্মতি',
    title: 'অডিও-নির্দেশিত সম্মতি',
    subtitle: 'দয়া করে সংক্ষিপ্ত অডিও নির্দেশিকা শুনুন অথবা নিচে শর্তাবলী পড়ুন।',
    audioGuideTitle: 'ভয়েস এবং ডেটা সম্মতি নির্দেশিকা',
    audioGuideSubtitle: 'বাংলায় শুনুন (১৫ সেকেন্ড)',
    spokenScript:
      'স্বাস্থ্যবাণীতে আপনাকে স্বাগতম। এগিয়ে যাওয়ার মাধ্যমে, আপনি সম্মতি দিচ্ছেন যে আপনার কণ্ঠস্বর, স্বাস্থ্যের বিবরণ এবং আপলোড করা মেডিকেল রিপোর্ট চিকিৎসকের সহায়তার জন্য এআই দ্বারা প্রক্রিয়া করা হবে। আপনার ডাক্তার চূড়ান্ত সিদ্ধান্ত নেওয়ার আগে সমস্ত তথ্য যাচাই করবেন।',
    bulletPoints: [
      {
        title: 'কণ্ঠস্বর ও উপসর্গের বিশ্লেষণ',
        description: 'আপনার কণ্ঠ ও উত্তর ডাক্তারের জন্য একটি ক্লিনিকাল সারসংক্ষেপে রূপান্তরিত হয়।',
      },
      {
        title: 'মেডিকেল রেকর্ড স্ক্যানিং',
        description: 'প্রেসক্রিপশন ও টেস্ট রিপোর্ট ডাক্তারকে দেখানোর জন্য ডিজিটালাইজ করা হয়।',
      },
      {
        title: 'চিকিৎসকের চূড়ান্ত সিদ্ধান্ত',
        description: 'এআই শুধুমাত্র তথ্য সংগ্রহে সহায়তা করে। সকল চিকিৎসা সিদ্ধান্ত চিকিৎসক গ্রহণ করেন।',
      },
      {
        title: 'তথ্য সুরক্ষা ও গোপনীয়তা',
        description: 'আপনার স্বাস্থ্য তথ্য সম্পূর্ণ সুরক্ষিত এবং গোপনীয় রাখা হয়।',
      },
    ],
    checkboxLabel: 'আমি বুঝতে পেরেছি এবং আমার চিকিৎসা পরামর্শের জন্য ডেটা প্রক্রিয়াকরণে সম্মতি দিচ্ছি।',
    btnAgree: 'সম্মতি দিন এবং এগিয়ে যান',
    btnChangeLanguage: 'ভাষা পরিবর্তন করুন',
    audioStatusPlaying: 'নির্দেশিকা বাজছে...',
    audioStatusPaused: 'অডিও থামানো হয়েছে।',
    audioStatusCompleted: 'অডিও শেষ হয়েছে।',
    audioStatusReady: 'বাংলায় শোনার জন্য প্লে টিপুন।',
    speechUnavailableNotice: 'ব্রাউজার ভয়েস দ্বারা অডিও পড়া হচ্ছে।',
  },

  'తెలుగు': {
    kicker: 'దశ 01 / 05 · రోగి సమ్మతి',
    title: 'ఆడియో-గైడెడ్ సమ్మతి',
    subtitle: 'దయచేసి చిన్న ఆడియో గైడ్ వినండి లేదా క్రింది నిబంధనలను చదవండి.',
    audioGuideTitle: 'వాయిస్ & డేటా సమ్మతి గైడ్',
    audioGuideSubtitle: 'తెలుగులో వినండి (15 సెకన్లు)',
    spokenScript:
      'స్వాస్థ్యవాణికి స్వాగతం. ముందుకు వెళ్లడం ద్వారా, మీ డాక్టర్‌కు సహాయపడటానికి మీ వాయిస్ సమాధానాలు మరియు ఆరోగ్య రికార్డులను మా AI సిస్టమ్ ప్రాసెస్ చేస్తుందని మీరు అంగీకరిస్తున్నారు. చికిత్సకు ముందు డాక్టర్ అన్ని వివరాలను ధృవీకరిస్తారు.',
    bulletPoints: [
      {
        title: 'వాయిస్ మరియు లక్షణాల విశ్లేషణ',
        description: 'మీ సమాధానాలు డాక్టర్ కోసం సంక్షిప్త క్లినికల్ నివేదికగా మార్చబడతాయి.',
      },
      {
        title: 'వైద్య రికార్డుల స్కానింగ్',
        description: 'పాత ప్రిస్క్రిప్షన్లు మరియు రిపోర్టులు డిజిటల్ రూపంలో చదవబడతాయి.',
      },
      {
        title: 'డాక్టర్ తుది నిర్ణయం',
        description: 'AI కేవలం సమాచార సేకరణలో సహాయపడుతుంది. డాక్టర్ మాత్రమే తుది చికిత్స నిర్ణయిస్తారు.',
      },
      {
        title: 'డేటా గోప్యత మరియు భద్రత',
        description: 'మీ ఆరోగ్య సమాచారం సురక్షితంగా మరియు గోప్యంగా ఉంచబడుతుంది.',
      },
    ],
    checkboxLabel: 'నేను అర్థం చేసుకున్నాను మరియు వైద్య సంప్రదింపుల కోసం డేటా ప్రాసెసింగ్‌కు అంగీకరిస్తున్నాను.',
    btnAgree: 'సమ్మతించి కొనసాగండి',
    btnChangeLanguage: 'భాష మార్చండి',
    audioStatusPlaying: 'ఆడియో ప్లే అవుతోంది...',
    audioStatusPaused: 'ఆడియో పాజ్ చేయబడింది.',
    audioStatusCompleted: 'ఆడియో పూర్తయింది.',
    audioStatusReady: 'తెలుగులో వినడానికి ప్లే నొక్కండి.',
    speechUnavailableNotice: 'బ్రౌజర్ వాయిస్ ద్వారా ఆడియో వినిపించబడుతోంది.',
  },

  'தமிழ்': {
    kicker: 'படி 01 / 05 · நோயாளி ஒப்புதல்',
    title: 'ஆடியோ வழிகாட்டல் ஒப்புதல்',
    subtitle: 'தயவுசெய்து ஆடியோ வழிகாட்டலைக் கேளுங்கள் அல்லது கீழே உள்ள விதிகளைப் படியுங்கள்.',
    audioGuideTitle: 'குரல் மற்றும் தரவு ஒப்புதல் வழிகாட்டி',
    audioGuideSubtitle: 'தமிழில் கேளுங்கள் (15 வினாடிகள்)',
    spokenScript:
      'ஸ்வாஸ்த்யவாணிக்கு வரவேற்கிறோம். தொடர்வதன் மூலம், உங்கள் குரல் பதில்கள், சுகாதார விவரங்கள் மற்றும் பதிவேற்றப்பட்ட மருத்துவ ஆவணங்கள் மருத்துவருக்கு உதவ AI அமைப்பால் செயலாக்கப்படும் என்பதை ஒப்புக்கொள்கிறீர்கள். மருத்துவர் தகவல்களை சரிபார்த்த பிறகே சிகிச்சையளிப்பார்.',
    bulletPoints: [
      {
        title: 'குரல் மற்றும் அறிகுறிகள் பகுப்பாய்வு',
        description: 'உங்கள் குரல் பதில்கள் மருத்துவருக்கு சுருக்கமாக மாற்றப்படுகின்றன.',
      },
      {
        title: 'மருத்துவ ஆவணங்கள் ஸ்கேனிங்',
        description: 'பழைய பரிந்துரைகள் மற்றும் அறிக்கைகள் டிஜிட்டல் முறையில் படிக்கப்படுகின்றன.',
      },
      {
        title: 'மருத்துவரின் இறுதி முடிவு',
        description: 'AI தகவல் சேகரிக்க மட்டுமே உதவுகிறது. மருத்துவரே இறுதி சிகிச்சை முடிவை எடுப்பார்.',
      },
      {
        title: 'தரவு பாதுகாப்பு மற்றும் தனியுரிமை',
        description: 'உங்கள் தகவல்கள் பாதுகாப்பாகவும் ரகசியமாகவும் வைக்கப்படுகின்றன.',
      },
    ],
    checkboxLabel: 'நான் புரிந்துகொண்டேன் மற்றும் மருத்துவ ஆலோசனைக்கு தரவு செயலாக்கத்தை ஒப்புக்கொள்கிறேன்.',
    btnAgree: 'ஒப்புக்கொண்டு தொடரவும்',
    btnChangeLanguage: 'மொழியை மாற்றவும்',
    audioStatusPlaying: 'ஆடியோ ஒலிக்கிறது...',
    audioStatusPaused: 'ஆடியோ நிறுத்தப்பட்டது.',
    audioStatusCompleted: 'ஆடியோ முடிந்தது.',
    audioStatusReady: 'தமிழில் கேட்க பிளே அழுத்தவும்.',
    speechUnavailableNotice: 'உலாவியின் குரல் மூலம் ஆடியோ வழிகாட்டப்படுகிறது.',
  },

  'ગુજરાતી': {
    kicker: 'પગલું 01 / 05 · દર્દી સંમતિ',
    title: 'ઑડિયો-માર્ગદર્શિત સંમતિ',
    subtitle: 'કૃપા કરીને ઑડિયો સાંભળો અથવા નીચે આપેલા ડેટા નિયમો વાંચો.',
    audioGuideTitle: 'વૉઇસ અને ડેટા સંમતિ માર્ગદર્શિકા',
    audioGuideSubtitle: 'ગુજરાતીમાં સાંભળો (15 સેકન્ડ)',
    spokenScript:
      'સ્વાસ્થ્યવાણીમાં આપનું સ્વાગત છે. આગળ વધીને, તમે સંમતિ આપો છો કે તમારા અવાજના જવાબો અને તબીબી દસ્તાવેજો ડૉક્ટરની મદદ માટે AI સિસ્ટમ દ્વારા પ્રોસેસ કરવામાં આવશે. ડૉક્ટર તમામ માહિતી ચકાસીને જ સારવાર નક્કી કરશે.',
    bulletPoints: [
      {
        title: 'અવાજ અને લક્ષણોનું વિશ્લેષણ',
        description: 'તમારા જવાબો ડૉક્ટર માટે સંક્ષિપ્ત સારાંશમાં રૂપાંતરિત થાય છે.',
      },
      {
        title: 'દસ્તાવેજોનું સ્કેનિંગ',
        description: 'જૂના રિપોર્ટ્સ અને પ્રિસ્ક્રિપ્શન્સ ડિજિટલ રીતે વાંચવામાં આવે છે.',
      },
      {
        title: 'ડૉક્ટરનો અંતિમ નિર્ણય',
        description: 'AI માત્ર માહિતી એકત્ર કરવામાં મદદ કરે છે. ડૉક્ટર જ અંતિમ નિર્ણય લેશે.',
      },
      {
        title: 'ડેટા સુરક્ષા અને ગોપનીયતા',
        description: 'તમારી માહિતી સંપૂર્ણપણે સુરક્ષિત અને ખાનગી રાખવામાં આવે છે.',
      },
    ],
    checkboxLabel: 'હું સમજું છું અને ડૉક્ટરની સલાહ માટે ડેટા પ્રોસેસિંગની સંમતિ આપું છું.',
    btnAgree: 'સંમતિ આપો અને આગળ વધો',
    btnChangeLanguage: 'ભાષા બદલો',
    audioStatusPlaying: 'ઑડિયો વાગી રહ્યો છે...',
    audioStatusPaused: 'ઑડિયો અટકાવાયો છે.',
    audioStatusCompleted: 'ઑડિયો પૂર્ણ થયો.',
    audioStatusReady: 'ગુજરાતીમાં સાંભળવા પ્લે દબાવો.',
    speechUnavailableNotice: 'બ્રાઉઝર વૉઇસ દ્વારા ઑડિયો બોલાય છે.',
  },

  'ಕನ್ನಡ': {
    kicker: 'ಹಂತ 01 / 05 · ರೋಗಿಯ ಒಪ್ಪಿಗೆ',
    title: 'ಆಡಿಯೋ-ಮಾರ್ಗದರ್ಶಿತ ಒಪ್ಪಿಗೆ',
    subtitle: 'ದಯವಿಟ್ಟು ಸಣ್ಣ ಆಡಿಯೋ ಮಾರ್ಗದರ್ಶನವನ್ನು ಕೇಳಿ ಅಥವಾ ಕೆಳಗಿನ ನಿಯಮಗಳನ್ನು ಓದಿ.',
    audioGuideTitle: 'ಧ್ವನಿ ಮತ್ತು ಡೇಟಾ ಒಪ್ಪಿಗೆ ಮಾರ್ಗದರ್ಶಿ',
    audioGuideSubtitle: 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳಿ (15 ಸೆಕೆಂಡುಗಳು)',
    spokenScript:
      'ಸ್ವಾಸ್ಥ್ಯವಾಣಿಗೆ ಸುಸ್ವಾಗತ. ಮುಂದುವರಿಯುವ ಮೂಲಕ, ನಿಮ್ಮ ಧ್ವನಿ ಪ್ರತಿಕ್ರಿಯೆಗಳು ಮತ್ತು ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳನ್ನು ವೈದ್ಯರಿಗೆ ಸಹಾಯ ಮಾಡಲು AI ಪ್ರಕ್ರಿಯೆಗೊಳಿಸುತ್ತದೆ ಎಂಬುದನ್ನು ನೀವು ಒಪ್ಪುತ್ತೀರಿ. ವೈದ್ಯರು ಪರಿಶೀಲಿಸಿದ ನಂತರವೇ ಚಿಕಿತ್ಸೆ ನೀಡುತ್ತಾರೆ.',
    bulletPoints: [
      {
        title: 'ಧ್ವನಿ ಮತ್ತು ಲಕ್ಷಣಗಳ ವಿಶ್ಲೇಷಣೆ',
        description: 'ನಿಮ್ಮ ಧ್ವನಿ ಉತ್ತರಗಳು ವೈದ್ಯರಿಗಾಗಿ ಸಂಕ್ಷಿಪ್ತ ವರದಿಯಾಗಿ ಸಿದ್ಧವಾಗುತ್ತವೆ.',
      },
      {
        title: 'ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳ ಸ್ಕ್ಯಾನಿಂಗ್',
        description: 'ಹಳೆಯ ಚೀಟಿಗಳು ಮತ್ತು ವರದಿಗಳನ್ನು ಡಿಜಿಟಲ್ ರೂಪದಲ್ಲಿ ಓದಲಾಗುತ್ತದೆ.',
      },
      {
        title: 'ವೈದ್ಯರ ಅಂತಿಮ ನಿರ್ಧಾರ',
        description: 'AI ಕೇವಲ ಮಾಹಿತಿ ಸಂಗ್ರಹಕ್ಕೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ. ವೈದ್ಯರೇ ಅಂತಿಮ ಚಿಕಿತ್ಸೆ ನಿರ್ಧರಿಸುತ್ತಾರೆ.',
      },
      {
        title: 'ಡೇಟಾ ಭದ್ರತೆ ಮತ್ತು ಗೌಪ್ಯತೆ',
        description: 'ನಿಮ್ಮ ವೈದ್ಯಕೀಯ ಮಾಹಿತಿ ಸಂಪೂರ್ಣ ಸುರಕ್ಷಿತ ಮತ್ತು ಗೌಪ್ಯವಾಗಿರುತ್ತದೆ.',
      },
    ],
    checkboxLabel: 'ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ ಮತ್ತು ವೈದ್ಯಕೀಯ ಸಮಾಲೋಚನೆಗಾಗಿ ಡೇಟಾ ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಒಪ್ಪುತ್ತೇನೆ.',
    btnAgree: 'ಒಪ್ಪಿ ಮುಂದುವರಿಯಿರಿ',
    btnChangeLanguage: 'ಭಾಷೆ ಬದಲಾಯಿಸಿ',
    audioStatusPlaying: 'ಆಡಿಯೋ ಪ್ಲೇ ಆಗುತ್ತಿದೆ...',
    audioStatusPaused: 'ಆಡಿಯೋ ವಿರಾಮಗೊಳಿಸಲಾಗಿದೆ.',
    audioStatusCompleted: 'ಆಡಿಯೋ ಪೂರ್ಣಗೊಂಡಿದೆ.',
    audioStatusReady: 'ಕನ್ನಡದಲ್ಲಿ ಕೇಳಲು ಪ್ಲೇ ಒತ್ತಿರಿ.',
    speechUnavailableNotice: 'ಬ್ರೌಸರ್ ಧ್ವನಿಯ ಮೂಲಕ ಆಡಿಯೋ ಪ್ಲೇ ಮಾಡಲಾಗುತ್ತಿದೆ.',
  },

  'മലയാളം': {
    kicker: 'ഘട്ടം 01 / 05 · രോഗിയുടെ സമ്മതം',
    title: 'ഓഡിയോ നിർദ്ദേശിത സമ്മതം',
    subtitle: 'ദയവായി ഓഡിയോ ഗൈഡ് കേൾക്കുക അല്ലെങ്കിൽ താഴെയുള്ള നിബന്ധനകൾ വായിക്കുക.',
    audioGuideTitle: 'ശബ്ദ & ഡാറ്റാ സമ്മത ഗൈഡ്',
    audioGuideSubtitle: 'മലയാളത്തിൽ കേൾക്കുക (15 സെക്കൻഡ്)',
    spokenScript:
      'സ്വാസ്ഥ്യവാണിയിലേക്ക് സ്വാഗതം. മുന്നോട്ട് പോകുന്നതിലൂടെ, നിങ്ങളുടെ ശബ്ദ പ്രതികരണങ്ങളും മെഡിക്കൽ രേഖകളും ഡോക്ടറെ സഹായിക്കുന്നതിനായി AI പ്രോസസ്സ് ചെയ്യുമെന്ന് നിങ്ങൾ സമ്മതിക്കുന്നു. ഡോക്ടർ പരിശോധിച്ച ശേഷമേ ചികിത്സ നിർണ്ണയിക്കൂ.',
    bulletPoints: [
      {
        title: 'ശബ്ദവും ലക്ഷണങ്ങളും വിശകലനം',
        description: 'നിങ്ങളുടെ ഉത്തരങ്ങൾ ഡോക്ടർക്കായി ഒരു സംഗ്രഹമാക്കി മാറ്റുന്നു.',
      },
      {
        title: 'മെഡിക്കൽ രേഖകൾ സ്കാനിംഗ്',
        description: 'പഴയ കുറിപ്പടികളും പരിശോധനാ ഫലങ്ങളും ഡിജിറ്റലായി വായിക്കുന്നു.',
      },
      {
        title: 'ഡോക്ടറുടെ അന്തിമ തീരുമാനം',
        description: 'AI വിവരങ്ങൾ ശേഖരിക്കാൻ മാത്രമേ സഹായിക്കൂ. ഡോക്ടറാണ് ചികിത്സ തീരുമാനിക്കുന്നത്.',
      },
      {
        title: 'വിവര സുരക്ഷയും സ്വകാര്യതയും',
        description: 'നിങ്ങളുടെ വിവരങ്ങൾ തികച്ചും സുരക്ഷിതവും രഹസ്യവുമായി സൂക്ഷിക്കുന്നു.',
      },
    ],
    checkboxLabel: 'ഞാൻ മനസ്സിലാക്കുന്നു, എന്റെ ചികിത്സാ പരിശോധനയ്ക്കായി ഡാറ്റ ഉപയോഗിക്കാൻ സമ്മതിക്കുന്നു.',
    btnAgree: 'സമ്മതിച്ച് മുന്നോട്ട് പോകുക',
    btnChangeLanguage: 'ഭാഷ മാറ്റുക',
    audioStatusPlaying: 'ഓഡിയോ പ്ലേ ചെയ്യുന്നു...',
    audioStatusPaused: 'ഓഡിയോ താൽക്കാലികമായി നിർത്തി.',
    audioStatusCompleted: 'ഓഡിയോ പൂർത്തിയായി.',
    audioStatusReady: 'മലയാളത്തിൽ കേൾക്കാൻ പ്ലേ അമർത്തുക.',
    speechUnavailableNotice: 'ബ്രൗസർ ശബ്ദം വഴി ഓഡിയോ വായിക്കുന്നു.',
  },

  'ਪੰਜਾਬੀ': {
    kicker: 'ਕਦਮ 01 / 05 · ਮਰੀਜ਼ ਦੀ ਸਹਿਮਤੀ',
    title: 'ਆਡੀਓ-ਨਿਰਦੇਸ਼ਿਤ ਸਹਿਮਤੀ',
    subtitle: 'ਕਿਰਪਾ ਕਰਕੇ ਆਡੀਓ ਗਾਈਡ ਸੁਣੋ ਜਾਂ ਹੇਠਾਂ ਦਿੱਤੀਆਂ ਸ਼ਰਤਾਂ ਪੜ੍ਹੋ।',
    audioGuideTitle: 'ਆਵਾਜ਼ ਅਤੇ ਡਾਟਾ ਸਹਿਮਤੀ ਗਾਈਡ',
    audioGuideSubtitle: 'ਪੰਜਾਬੀ ਵਿੱਚ ਸੁਣੋ (15 ਸਕਿੰਟ)',
    spokenScript:
      'ਸਵਾਸਥਿਆਵਾਣੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ। ਅੱਗੇ ਵਧ ਕੇ, ਤੁਸੀਂ ਸਹਿਮਤੀ ਦਿੰਦੇ ਹੋ ਕਿ ਤੁਹਾਡੀ ਆਵਾਜ਼ ਦੇ ਜਵਾਬ ਅਤੇ ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਡਾਕਟਰ ਦੀ ਮਦਦ ਲਈ AI ਪ੍ਰਣਾਲੀ ਦੁਆਰਾ ਪ੍ਰੋਸੈਸ ਕੀਤੇ ਜਾਣਗੇ। ਡਾਕਟਰ ਇਲਾਜ ਤੋਂ ਪਹਿਲਾਂ ਸਾਰੀ ਜਾਣਕਾਰੀ ਦੀ ਸਮੀਖਿਆ ਕਰਨਗੇ।',
    bulletPoints: [
      {
        title: 'ਆਵਾਜ਼ ਅਤੇ ਲੱਛਣਾਂ ਦਾ ਵਿਸ਼ਲੇਸ਼ਣ',
        description: 'ਤੁਹਾਡੇ ਜਵਾਬ ਡਾਕਟਰ ਲਈ ਮੈਡੀਕਲ ਸਾਰਾਂਸ਼ ਵਜੋਂ ਤਿਆਰ ਕੀਤੇ ਜਾਂਦੇ ਹਨ।',
      },
      {
        title: 'ਮੈਡੀਕਲ ਰਿਕਾਰਡ ਸਕੈਨਿੰਗ',
        description: 'ਪੁਰਾਣੀਆਂ ਪਰਚੀਆਂ ਅਤੇ ਟੈਸਟ ਰਿਪੋਰਟਾਂ ਡਿਜੀਟਲ ਰੂਪ ਵਿੱਚ ਪੜ੍ਹੀਆਂ ਜਾਂਦੀਆਂ ਹਨ।',
      },
      {
        title: 'ਡਾਕਟਰ ਦਾ ਅੰਤਿਮ ਫੈਸਲਾ',
        description: 'AI ਸਿਰਫ਼ ਜਾਣਕਾਰੀ ਇਕੱਠੀ ਕਰਨ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹੈ। ਅੰਤਿਮ ਫੈਸਲਾ ਡਾਕਟਰ ਹੀ ਲੈਂਦੇ ਹਨ।',
      },
      {
        title: 'ਡਾਟਾ ਸੁਰੱਖਿਆ ਅਤੇ ਗੋਪਨੀਯਤਾ',
        description: 'ਤੁਹਾਡੀ ਜਾਣਕਾਰੀ ਪੂਰੀ ਤਰ੍ਹਾਂ ਸੁਰੱਖਿਅਤ ਅਤੇ ਗੁਪਤ ਰੱਖੀ ਜਾਂਦੀ ਹੈ।',
      },
    ],
    checkboxLabel: 'ਮੈਂ ਸਮਝਦਾ/ਸਮਝਦੀ ਹਾਂ ਅਤੇ ਡਾਕਟਰੀ ਸਲਾਹ ਲਈ ਡਾਟਾ ਪ੍ਰੋਸੈਸਿੰਗ ਦੀ ਸਹਿਮਤੀ ਦਿੰਦਾ/ਦਿੰਦੀ ਹਾਂ।',
    btnAgree: 'ਸਹਿਮਤੀ ਦਿਓ ਅਤੇ ਅੱਗੇ ਵਧੋ',
    btnChangeLanguage: 'ਭਾਸ਼ਾ ਬਦਲੋ',
    audioStatusPlaying: 'ਆਡੀਓ ਚੱਲ ਰਿਹਾ ਹੈ...',
    audioStatusPaused: 'ਆਡੀਓ ਰੋਕਿਆ ਗਿਆ ਹੈ।',
    audioStatusCompleted: 'ਆਡੀਓ ਪੂਰਾ ਹੋ ਗਿਆ।',
    audioStatusReady: 'ਪੰਜਾਬੀ ਵਿੱਚ ਸੁਣਨ ਲਈ ਪਲੇ ਦਬਾਓ।',
    speechUnavailableNotice: 'ਬ੍ਰਾਊਜ਼ਰ ਆਵਾਜ਼ ਦੁਆਰਾ ਆਡੀਓ ਪੜ੍ਹਿਆ ਜਾ ਰਿਹਾ ਹੈ।',
  },

  'ଓଡ଼ିଆ': {
    kicker: 'ପର୍ଯ୍ୟାୟ 01 / 05 · ରୋଗୀ ସମ୍ମତି',
    title: 'ଅଡିଓ-ମାର୍ଗଦର୍ଶିତ ସମ୍ମତି',
    subtitle: 'ଦୟାକରି ଛୋଟ ଅଡିଓ ଗାଇଡ୍ ଶୁଣନ୍ତୁ କିମ୍ବା ନିମ୍ନ ନିୟମ ପଢ଼ନ୍ତୁ।',
    audioGuideTitle: 'ସ୍ୱର ଏବଂ ତଥ୍ୟ ସମ୍ମତି ଗାଇଡ୍',
    audioGuideSubtitle: 'ଓଡ଼ିଆରେ ଶୁଣନ୍ତୁ (15 ସେକେଣ୍ଡ)',
    spokenScript:
      'ସ୍ୱାସ୍ଥ୍ୟବାଣୀକୁ ସ୍ୱାଗତ। ଆଗକୁ ବଢ଼ିବା ଦ୍ୱାରା, ଆପଣ ସମ୍ମତି ଦିଅନ୍ତି ଯେ ଆପଣଙ୍କ ସ୍ୱର ପ୍ରତିକ୍ରିୟା ଏବଂ ମେଡିକାଲ ରେକର୍ଡ ଡାକ୍ତରଙ୍କ ସହାୟତା ପାଇଁ AI ପ୍ରଣାଳୀ ଦ୍ୱାରା ପ୍ରକ୍ରିୟାକରଣ କରାଯିବ।',
    bulletPoints: [
      {
        title: 'ସ୍ୱର ଏବଂ ଲକ୍ଷଣ ବିଶ୍ଳେଷଣ',
        description: 'ଆପଣଙ୍କ ଉତ୍ତର ଡାକ୍ତରଙ୍କ ପାଇଁ ଏକ ସାରାଂଶରେ ପରିଣତ ହୁଏ।',
      },
      {
        title: 'ଡାକ୍ତରୀ ରେକର୍ଡ ସ୍କାନିଂ',
        description: 'ପୁରୁଣା ପ୍ରେସକ୍ରିପସନ୍ ଏବଂ ରିପୋର୍ଟ ଡିଜିଟାଲ୍ ଭାବରେ ପଢ଼ାଯାଏ।',
      },
      {
        title: 'ଡାକ୍ତରଙ୍କ ଚୂଡ଼ାନ୍ତ ନିଷ୍ପତ୍ତି',
        description: 'AI କେବଳ ତଥ୍ୟ ସଂଗ୍ରହରେ ସାହାଯ୍ୟ କରେ। ଡାକ୍ତର ହିଁ ଚିକିତ୍ସା ନିଷ୍ପତ୍ତି ନିଅନ୍ତି।',
      },
      {
        title: 'ଡାଟା ସୁରକ୍ଷା ଓ ଗୋପନୀୟତା',
        description: 'ଆପଣଙ୍କ ତଥ୍ୟ ସମ୍ପୂର୍ଣ୍ଣ ସୁରକ୍ଷିତ ଏବଂ ଗୋପନୀୟ ରଖାଯାଏ।',
      },
    ],
    checkboxLabel: 'ମୁଁ ବୁଝିଲି ଏବଂ ଡାକ୍ତରୀ ପରାମର୍ଶ ପାଇଁ ତଥ୍ୟ ପ୍ରକ୍ରିୟାକରଣରେ ସମ୍ମତି ଦେଉଛି।',
    btnAgree: 'ସମ୍ମତି ଦିଅନ୍ତୁ ଏବଂ ଆଗକୁ ବଢ଼ନ୍ତୁ',
    btnChangeLanguage: 'ଭାଷା ବଦଳାନ୍ତୁ',
    audioStatusPlaying: 'ଅଡିଓ ଚାଲୁଅଛି...',
    audioStatusPaused: 'ଅଡିଓ ଅଟକିଛି।',
    audioStatusCompleted: 'ଅଡିଓ ସମାପ୍ତ ହେଲା।',
    audioStatusReady: 'ଓଡ଼ିଆରେ ଶୁଣିବା ପାଇଁ ପ୍ଲେ ଦବାନ୍ତୁ।',
    speechUnavailableNotice: 'ବ୍ରାଉଜର୍ ଭଏସ୍ ମାଧ୍ୟମରେ ଅଡିଓ ଶୁଣାଯାଉଛି।',
  },

  'অসমীয়া': {
    kicker: 'স্তৰ 01 / 05 · ৰোগীৰ সন্মতি',
    title: 'অডিঅ’-নিৰ্দেশিত সন্মতি',
    subtitle: 'অনুগ্ৰহ কৰি চমু অডিঅ’ নিৰ্দেশিকা শুনক বা তলৰ চৰ্তসমূহ পঢ়ক।',
    audioGuideTitle: 'কণ্ঠস্বৰ আৰু তথ্য সন্মতি নিৰ্দেশিকা',
    audioGuideSubtitle: 'অসমীয়াত শুনক (15 ছেকেণ্ড)',
    spokenScript:
      'স্বাস্থ্যবাণীলৈ স্বাগতম। আগবাঢ়ি গৈ আপুনি সন্মতি দিয়ে যে আপোনাৰ কণ্ঠস্বৰৰ সঁহাৰি আৰু চিকিৎসা নথিপত্ৰ চিকিৎসকৰ সহায়ৰ বাবে AI দ্বাৰা বিশ্লেষণ কৰা হ’ব। চিকিৎসকে সকলো তথ্য পৰীক্ষা কৰিহে চিকিৎসা কৰিব।',
    bulletPoints: [
      {
        title: 'কণ্ঠস্বৰ আৰু লক্ষণৰ বিশ্লেষণ',
        description: 'আপোনাৰ উত্তৰসমূহ চিকিৎসকৰ বাবে এটা সাৰাংশলৈ ৰূপান্তৰিত হয়।',
      },
      {
        title: 'চিকিৎসা নথি স্কেনিং',
        description: 'পুৰণি প্ৰেছক্ৰিপশ্বন আৰু ৰিপ’ৰ্টসমূহ ডিজিটেল ৰূপত পঢ়া হয়।',
      },
      {
        title: 'চিকিৎসকৰ চূড়ান্ত সিদ্ধান্ত',
        description: 'AI-য়ে কেৱল তথ্য সংগ্ৰহত সহায় কৰে। চিকিৎসকেহে চূড়ান্ত সিদ্ধান্ত লয়।',
      },
      {
        title: 'তথ্য সুৰক্ষা আৰু গোপনীয়তা',
        description: 'আপোনাৰ তথ্য সম্পূৰ্ণ সুৰক্ষিত আৰু গোপনীয় কৰি ৰখা হয়।',
      },
    ],
    checkboxLabel: 'মই বুজি পাইছো আৰু চিকিৎসা পৰামৰ্শৰ বাবে তথ্য ব্যৱহাৰত সন্মতি দিছো।',
    btnAgree: 'সন্মতি দিয়ক আৰু আগবাঢ়ক',
    btnChangeLanguage: 'ভাষা সলনি কৰক',
    audioStatusPlaying: 'অডিঅ’ বাজি আছে...',
    audioStatusPaused: 'অডিঅ’ বন্ধ কৰা হৈছে।',
    audioStatusCompleted: 'অডিঅ’ সমাপ্ত হ’ল।',
    audioStatusReady: 'অসমীয়াত শুনিবলৈ প্লে টিপক।',
    speechUnavailableNotice: 'ব্ৰাউজাৰৰ কণ্ঠৰে অডিঅ’ বজোৱা হৈছে।',
  },

  'اردو': {
    kicker: 'مرحلہ 01 / 05 · مریض کی رضامندی',
    title: 'آڈیو رہنمائی کے ساتھ رضامندی',
    subtitle: 'براہ کرم آڈیو گائیڈ سنیں یا نیچے دی گئی شرائط پڑھیں۔',
    audioGuideTitle: 'آواز اور ڈیٹا رضامندی گائیڈ',
    audioGuideSubtitle: 'اردو میں سنیں (15 سیکنڈ)',
    spokenScript:
      'سواستھیہ وانی میں خوش آمدید۔ آگے بڑھ کر، آپ رضامندی دیتے ہیں کہ آپ کی آواز کے جوابات اور طبی ریکارڈز ڈاکٹر کی مدد کے لیے ہمارے AI نظام کے ذریعے پروسیس کیے جائیں گے۔ ڈاکٹر علاج سے پہلے تمام معلومات کی تصدیق کریں گے۔',
    bulletPoints: [
      {
        title: 'آواز اور علامات کا تجزیہ',
        description: 'آپ کی آواز اور جوابات ڈاکٹر کے لیے خلاصے میں تبدیل کیے جاتے ہیں۔',
      },
      {
        title: 'طبی دستاویزات کی اسکیننگ',
        description: 'پرانے نسخے اور ٹیسٹ رپورٹس ڈیجیٹل طور پر پڑھی جاتی ہیں۔',
      },
      {
        title: 'ڈاکٹر کا حتمی فیصلہ',
        description: 'AI صرف معلومات جمع کرنے میں مدد کرتا ہے۔ حتمی فیصلہ ڈاکٹر کا ہی ہوتا ہے۔',
      },
      {
        title: 'ڈیٹا کا تحفظ اور رازداری',
        description: 'آپ کی تمام معلومات مکمل طور پر محفوظ اور پوشیدہ رکھی جاتی ہیں۔',
      },
    ],
    checkboxLabel: 'میں سمجھتا/سمجھتی ہوں اور طبی مشورے کے لیے ڈیٹا پروسیسنگ کی رضامندی دیتا/دیتی ہوں۔',
    btnAgree: 'رضامندی دیں اور آگے بڑھیں',
    btnChangeLanguage: 'زبان تبدیل کریں',
    audioStatusPlaying: 'آڈیو چل رہا ہے...',
    audioStatusPaused: 'آڈیو روکا گیا ہے۔',
    audioStatusCompleted: 'آڈیو مکمل ہو گیا۔',
    audioStatusReady: 'اردو میں سننے کے لیے پلے دبائیں۔',
    speechUnavailableNotice: 'براؤزر آواز کے ذریعے آڈیو سنائی جا رہی ہے۔',
  },
};

export function getConsentTranslation(lang: string): ConsentTranslation {
  if (!lang) return CONSENT_TRANSLATIONS['English'];
  if (CONSENT_TRANSLATIONS[lang]) return CONSENT_TRANSLATIONS[lang];

  // Map common language alias names
  const lower = lang.toLowerCase();
  if (lower.includes('hindi') || lower === 'hi') return CONSENT_TRANSLATIONS['हिन्दी'];
  if (lower.includes('marathi') || lower === 'mr') return CONSENT_TRANSLATIONS['मराठी'];
  if (lower.includes('bengali') || lower === 'bn') return CONSENT_TRANSLATIONS['বাংলা'];
  if (lower.includes('telugu') || lower === 'te') return CONSENT_TRANSLATIONS['తెలుగు'];
  if (lower.includes('tamil') || lower === 'ta') return CONSENT_TRANSLATIONS['தமிழ்'];
  if (lower.includes('gujarati') || lower === 'gu') return CONSENT_TRANSLATIONS['ગુજરાતી'];
  if (lower.includes('kannada') || lower === 'kn') return CONSENT_TRANSLATIONS['ಕನ್ನಡ'];
  if (lower.includes('malayalam') || lower === 'ml') return CONSENT_TRANSLATIONS['മലയാളം'];
  if (lower.includes('punjabi') || lower === 'pa') return CONSENT_TRANSLATIONS['ਪੰਜਾਬੀ'];
  if (lower.includes('odia') || lower === 'or') return CONSENT_TRANSLATIONS['ଓଡ଼ିଆ'];
  if (lower.includes('assamese') || lower === 'as') return CONSENT_TRANSLATIONS['অসমীয়া'];
  if (lower.includes('urdu') || lower === 'ur') return CONSENT_TRANSLATIONS['اردو'];

  return CONSENT_TRANSLATIONS['English'];
}

export function getConsentLanguageLocale(lang: string): string {
  const lower = (lang || '').toLowerCase();
  if (lang === 'हिन्दी' || lower.includes('hindi') || lower === 'hi') return 'hi-IN';
  if (lang === 'मराठी' || lower.includes('marathi') || lower === 'mr') return 'mr-IN';
  if (lang === 'বাংলা' || lower.includes('bengali') || lower === 'bn') return 'bn-IN';
  if (lang === 'தமிழ்' || lower.includes('tamil') || lower === 'ta') return 'ta-IN';
  if (lang === 'తెలుగు' || lower.includes('telugu') || lower === 'te') return 'te-IN';
  if (lang === 'ગુજરાતી' || lower.includes('gujarati') || lower === 'gu') return 'gu-IN';
  if (lang === 'ಕನ್ನಡ' || lower.includes('kannada') || lower === 'kn') return 'kn-IN';
  if (lang === 'മലയാളം' || lower.includes('malayalam') || lower === 'ml') return 'ml-IN';
  if (lang === 'ਪੰਜਾਬੀ' || lower.includes('punjabi') || lower === 'pa') return 'pa-IN';
  if (lang === 'ଓଡ଼ିଆ' || lower.includes('odia') || lower === 'or') return 'or-IN';
  if (lang === 'অসমীয়া' || lower.includes('assamese') || lower === 'as') return 'as-IN';
  if (lang === 'اردو' || lower.includes('urdu') || lower === 'ur') return 'ur-IN';
  return 'en-IN';
}
