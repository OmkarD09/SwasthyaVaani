import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, ArrowRight, Mic, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';
import { getKioskTranslation } from '../lib/kioskTranslations';
import { recordIntakeAnswer } from '../lib/conversationStore';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'patient';
  text: string;
  time: string;
  chips?: string[];
}

interface QuestionConfig {
  id: string;
  category: string;
  question: Record<string, string>;
  chips: Record<string, string[]>;
}

const INTAKE_QUESTIONS: QuestionConfig[] = [
  {
    id: 'chief_complaint',
    category: 'Chief Complaint',
    question: {
      English: 'Hello! I am SwasthyaVaani, your AI health assistant. What main symptom or health concern brings you in today?',
      'हिन्दी': 'नमस्ते! मैं स्वास्थ्यवाणी हूँ, आपका AI स्वास्थ्य सहायक। आज आपको क्या मुख्य तकलीफ या लक्षण महसूस हो रहे हैं?',
      'বাংলা': 'নমস্কার! আমি স্বাস্থ্যবাণী, আপনার এআই স্বাস্থ্য সহকারী। আজকে আপনার প্রধান সমস্যা বা উপসর্গ কী?',
      'मराठी': 'नमस्कार! मी स्वास्थ्यवाणी आहे, तुमचा AI आरोग्य सहाय्यक. आज तुम्हाला कोणता मुख्य त्रास किंवा लक्षण जाणवत आहे?',
      'తెలుగు': 'నమస్కారం! నేను స్వాస్థ్యవాణి, మీ AI ఆరోగ్య సహాయకుడిని. ఈ రోజు మీకు ఉన్న ప్రధాన సమస్య లేదా లక్షణం ఏమిటి?',
      'தமிழ்': 'வணக்கம்! நான் ஸ்வாஸ்த்யவாணி, உங்கள் AI சுகாதார உதவியாளர். இன்று உங்களுக்கு என்ன முக்கிய அறிகுறி அல்லது பிரச்சனை உள்ளது?',
      'ગુજરાતી': 'નમસ્તે! હું સ્વાસ્થ્યવાણી છું, તમારો AI હેલ્થ આસિસ્ટન્ટ. આજે તમને મુખ્ય કઈ તકલીફ કે લક્ષણ છે?',
      'ಕನ್ನಡ': 'ನಮಸ್ಕಾರ! ನಾನು ಸ್ವಾಸ್ಥ್ಯವಾಣಿ, ನಿಮ್ಮ AI ಆರೋಗ್ಯ ಸಹಾಯಕ. ಇಂದು ನಿಮಗೆ ಯಾವ ಮುಖ್ಯ ಸಮಸ್ಯೆ ಅಥವಾ ಲಕ್ಷಣವಿದೆ?',
      'മലയാളം': 'നമസ്കാരം! ഞാൻ സ്വാസ്ഥ്യവാണി, നിങ്ങളുടെ AI ഹെൽത്ത് അസിസ്റ്റന്റ്. ഇന്ന് നിങ്ങൾക്ക് എന്താണ് പ്രധാന ബുദ്ധിമുട്ട്?',
      'ਪੰਜਾਬੀ': 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਵਾਸਥਿਆਵਾਣੀ ਹਾਂ, ਤੁਹਾਡਾ AI ਸਿਹਤ ਸਹਾਇਕ। ਅੱਜ ਤੁਹਾਨੂੰ ਕਿਹੜੀ ਮੁੱਖ ਸਮੱਸਿਆ ਜਾਂ ਲੱਛਣ ਹੈ?',
      'ଓଡ଼ିଆ': 'ନମସ୍କାର! ମୁଁ ସ୍ୱାସ୍ଥ୍ୟବାଣୀ, ଆପଣଙ୍କ AI ସ୍ୱାସ୍ଥ୍ୟ ସହାୟକ। ଆଜି ଆପଣଙ୍କର ମୁଖ୍ୟ ଲକ୍ଷଣ କଣ?',
      'অসমীয়া': 'নমস্কাৰ! মই স্বাস্থ্যবাণী, আপোনাৰ AI স্বাস্থ্য সহায়ক। আজি আপোনাৰ মূল সমস্যা বা লক্ষণ কি?',
      'اردو': 'ہیلو! میں سواستھیہ وانی ہوں، آپ کا AI ہیلتھ اسسٹنٹ۔ آج آپ کو کیا بنیادی شکایت یا علامت ہے؟',
    },
    chips: {
      English: ['Pain / Body Ache', 'Fever & Chills', 'Cough / Breathing', 'Stomach / Acidity', 'Skin Issue', 'Other'],
      'हिन्दी': ['दर्द / बदन दर्द', 'बुखार और ठंड', 'खांसी / सांस की तकलीफ', 'पेट दर्द / गैस', 'त्वचा की समस्या', 'अन्य'],
      'বাংলা': ['ব্যথা / শরীরে ব্যথা', 'জ্বর এবং কাঁপুনি', 'কাশি / শ্বাসকষ্ট', 'পেট খারাপ / বুকজ্বালা', 'অন্যান্য'],
      'मराठी': ['अंगदुखी / वेदना', 'ताप आणि थंडी', 'खोकला / दम लागणे', 'पोटदुखी / पित्त', 'इतर'],
      'తెలుగు': ['నొప్పి / ఒళ్ళు నొప్పులు', 'జ్వరం & చలి', 'దగ్గు / శ్వాస తీసుకోవడం', 'కడుపు నొప్పి / గ్యాస్', 'ఇతర'],
      'தமிழ்': ['வலி / உடல் வலி', 'காய்ச்சல் & குளிர்', 'இருமல் / மூச்சுத்திணறல்', 'வயிற்று வலி / அசிடிட்டி', 'மற்றவை'],
      'ગુજરાતી': ['દુખાવો / શરીરમાં દુખાવો', 'તાવ અને ઠંડી', 'ખાંસી / શ્વાસની તકલીફ', 'પેટમાં દુખાવો / ગેસ', 'અન્ય'],
      'ಕನ್ನಡ': ['ನೋವು / ಮೈಕೈನೋವು', 'ಜ್ವರ ಮತ್ತು ಚಳಿ', 'ಕೆಮ್ಮು / ಉಸಿರಾಟದ ತೊಂದರೆ', 'ಹೊಟ್ಟೆ ನೋವು / ಗ್ಯಾಸ್', 'ಇತರ'],
      'മലയാളം': ['വേദന / ശരീരവേദന', 'പനിയും വിറയലും', 'ചുമ / ശ്വാസതടസ്സം', 'വയറുവേദന / ഗ്യാസ്', 'മറ്റുള്ളവ'],
      'ਪੰਜਾਬੀ': ['ਦਰਦ / ਸਰੀਰ ਦਰਦ', 'ਬੁਖਾਰ ਅਤੇ ਕੰਬਣੀ', 'ਖੰਘ / ਸਾਹ ਚੜ੍ਹਨਾ', 'ਪੇਟ ਦਰਦ / ਗੈਸ', 'ਹੋਰ'],
      'ଓଡ଼ିଆ': ['ଯନ୍ତ୍ରଣା / ଦେହ ହାତ ବିନ୍ଧା', 'ଜ୍ୱର ଓ ଥଣ୍ଡା', 'କାଶ / ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ', 'ପେଟ ଯନ୍ତ୍ରଣା', 'ଅନ୍ୟାନ୍ୟ'],
      'অসমীয়া': ['বিষ / গাৰ বিষ', 'জ্বৰ আৰু ঠাণ্ডা', 'কাহ / উশাহৰ সমস্যা', 'পেটৰ বিষ / গেছ', 'অন্যান্য'],
      'اردو': ['درد / جسم کا درد', 'بخار اور سردی', 'کھانسی / سانس کا مسئلہ', 'پیٹ کا درد / تیزابیت', 'دیگر'],
    },
  },
  {
    id: 'onset',
    category: 'Duration & Onset',
    question: {
      English: 'When did you first notice these symptoms starting?',
      'हिन्दी': 'यह लक्षण सबसे पहले कब शुरू हुए थे?',
      'বাংলা': 'এই উপসর্গগুলি প্রথমে কখন শুরু হয়েছিল?',
      'मराठी': 'ही लक्षणे सर्वात आधी कधी सुरू झाली होती?',
      'తెలుగు': 'ఈ లక్షణాలు మొదట ఎప్పుడు ప్రారంభమయ్యాయి?',
      'தமிழ்': 'இந்த அறிகுறிகள் முதன்முதலில் எப்போது தொடங்கின?',
      'ગુજરાતી': 'આ લક્ષણો સૌથી પહેલાં ક્યારે શરૂ થયાં હતાં?',
      'ಕನ್ನಡ': 'ಈ ಲಕ್ಷಣಗಳು ಮೊದಲು ಯಾವಾಗ ಪ್ರಾರಂಭವಾದವು?',
      'മലയാളം': 'ഈ ലക്ഷണങ്ങൾ എപ്പോഴാണ് ആദ്യമായി തുടങ്ങിയത്?',
      'ਪੰਜਾਬੀ': 'ਇਹ ਲੱਛਣ ਸਭ ਤੋਂ ਪਹਿਲਾਂ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਏ ਸਨ?',
      'ଓଡ଼ିଆ': 'ଏହି ଲକ୍ଷଣଗୁଡ଼ିକ ପ୍ରଥମେ କେବେ ଆରମ୍ଭ ହୋଇଥିଲା?',
      'অসমীয়া': 'এই লক্ষণসমূহ প্ৰথম কেতিয়া দেখা দিছিল?',
      'اردو': 'یہ علامات سب سے پہلے کب شروع ہوئیں؟',
    },
    chips: {
      English: ['Today morning', 'Yesterday', '2–3 days ago', 'More than 1 week', 'Chronic / Ongoing'],
      'हिन्दी': ['आज सुबह', 'कल से', '2–3 दिन पहले', 'एक सप्ताह से अधिक', 'काफी समय से'],
      'বাংলা': ['আজ সকালে', 'গতকাল', '২-৩ দিন আগে', '১ সপ্তাহের বেশি', 'অনেক দিন ধরে'],
      'मराठी': ['आज सकाळी', 'कालपासून', '२-३ दिवसांपूर्वी', '१ आठवड्यापेक्षा जास्त', 'खूप दिवसांपासून'],
      'తెలుగు': ['ఈ రోజు ఉదయం', 'నిన్న', '2–3 రోజుల క్రితం', '1 వారం కంటే ఎక్కువ', 'చాలా కాలంగా'],
      'தமிழ்': ['இன்று காலை', 'நேற்று', '2–3 நாட்களுக்கு முன்பு', '1 வாரத்திற்கு மேல்', 'நீண்ட நாட்களாக'],
      'ગુજરાતી': ['આજે સવારે', 'ગઈકાલે', '૨-૩ દિવસ પહેલાં', '૧ અઠવાડિયા કરતાં વધુ', 'લાંબા સમયથી'],
      'ಕನ್ನಡ': ['ಇಂದು ಬೆಳಿಗ್ಗೆ', 'ನಿನ್ನೆ', '೨-೩ ದಿನಗಳ ಹಿಂದೆ', '೧ ವಾರಕ್ಕಿಂತ ಹೆಚ್ಚು', 'ದೀರ್ಘಕಾಲದಿಂದ'],
      'മലയാളം': ['ഇന്ന് രാവിലെ', 'ഇന്നലെ', '2–3 ദിവസം മുൻപ്', '1 ആഴ്ചയിൽ കൂടുതൽ', 'കുറേക്കാലമായി'],
      'ਪੰਜਾਬੀ': ['ਅੱਜ ਸਵੇਰੇ', 'ਕੱਲ੍ਹ', '2–3 ਦਿਨ ਪਹਿਲਾਂ', '1 ਹਫ਼ਤੇ ਤੋਂ ਵੱਧ', 'ਕਾਫ਼ੀ ਸਮੇਂ ਤੋਂ'],
      'ଓଡ଼ିଆ': ['ଆଜି ସକାଳେ', 'ଗତକାଲି', '୨–୩ ଦିନ ପୂର୍ବରୁ', '୧ ସପ୍ତାହରୁ ଅଧିକ', 'ଦୀର୍ଘ ଦିନରୁ'],
      'অসমীয়া': ['আজি পুৱা', 'কালি', '২-৩ দিন আগতে', '১ সপ্তাহতকৈ বেছি', 'বহু দিন ধৰি'],
      'اردو': ['آج صبح', 'کل', '2–3 دن پہلے', 'ایک ہفتے سے زیادہ', 'کافی عرصے سے'],
    },
  },
  {
    id: 'severity',
    category: 'Severity Level',
    question: {
      English: 'How would you describe the severity or intensity of your discomfort?',
      'हिन्दी': 'आप अपनी तकलीफ की तीव्रता या गंभीरता को कैसे बताएंगे?',
      'বাংলা': 'আপনার অস্বস্তি বা যন্ত্রণার মাত্রা কতটা তীব্র?',
      'मराठी': 'तुमच्या त्रासाची तीव्रता कशी आहे?',
      'తెలుగు': 'మీ బాధ లేదా అసౌకర్య తీవ్రతను ఎలా వివరిస్తారు?',
      'தமிழ்': 'உங்கள் அசௌகரியத்தின் தீவிரத்தை எவ்வாறு விவரிப்பீர்கள்?',
      'ગુજરાતી': 'તમારી તકલીફ કેટલી તીવ્ર છે?',
      'ಕನ್ನಡ': 'ನಿಮ್ಮ ತೊಂದರೆಯ ತೀವ್ರತೆಯನ್ನು ಹೇಗೆ ವಿವರಿಸುತ್ತೀರಿ?',
      'മലയാളം': 'നിങ്ങളുടെ ബുദ്ധിമുട്ടിന്റെ തീവ്രത എങ്ങനെയാണ്?',
      'ਪੰਜਾਬੀ': 'ਤੁਹਾਡੀ ਤਕਲੀਫ਼ ਦੀ ਗੰਭੀਰਤਾ ਕਿੰਨੀ ਕੁ ਹੈ?',
      'ଓଡ଼ିଆ': 'ଆପଣଙ୍କ କଷ୍ଟର ତୀବ୍ରତା କିପରି ଅଛି?',
      'অসমীয়া': 'আপোনাৰ কষ্টৰ মাত্ৰা কিমান তীব্ৰ?',
      'اردو': 'آپ اپنی تکلیف کی شدت کو کیسے بیان کریں گے؟',
    },
    chips: {
      English: ['Mild (Manageable)', 'Moderate (Troublesome)', 'Severe (Intense)', 'Comes & Goes in Waves'],
      'हिन्दी': ['हल्का दर्द (सहने योग्य)', 'मध्यम दर्द (परेशान करने वाला)', 'तेज़ दर्द (असहनीय)', 'रुक-रुक कर आता है'],
      'বাংলা': ['হালকা (সহ্য করার মতো)', 'মাঝারি (কষ্টদায়ক)', 'তীব্র (অসহ্য)', 'মাঝে মাঝে বাড়ে কমে'],
      'मराठी': ['हलका त्रास (सहन होणारा)', 'मध्यम त्रास', 'तीव्र वेदना', 'कधी कमी कधी जास्त'],
      'తెలుగు': ['తేలికపాటి (భరించదగినది)', 'మధ్యస్థ నొప్పి', 'తీవ్రమైన నొప్పి', 'వచ్చి పోతూ ఉంటుంది'],
      'தமிழ்': ['லேசானது (தாங்கக்கூடியது)', 'மிதமான வலி', 'கடுமையான வலி', 'வந்து போகிறது'],
      'ગુજરાતી': ['હળવો દુખાવો', 'મધ્યમ દુખાવો', 'તીવ્ર દુખાવો', 'વચ્ચે વચ્ચે થાય છે'],
      'ಕನ್ನಡ': ['ಸ್ವಲ್ಪ ನೋವು', 'ಮಧ್ಯಮ ನೋವು', 'ತೀವ್ರವಾದ ನೋವು', 'ಬಂದು ಹೋಗುತ್ತದೆ'],
      'മലയാളം': ['നേരിയ വേദന', 'ഇടത്തരം വേദന', 'കഠിനമായ വേദന', 'വന്നും പോയുമിരിക്കുന്നു'],
      'ਪੰਜਾਬੀ': ['ਹਲਕਾ ਦਰਦ', 'ਦਰਮਿਆਨਾ ਦਰਦ', 'ਬਹੁਤ ਤੇਜ਼ ਦਰਦ', 'ਰੁਕ ਰੁਕ ਕੇ ਹੁੰਦਾ ਹੈ'],
      'ଓଡ଼ିଆ': ['ଅଳ୍ପ କଷ୍ଟ', 'ମଧ୍ୟମ ଧରଣର କଷ୍ଟ', 'ତୀବ୍ର ଯନ୍ତ୍ରଣା', 'ଆସିବା ଯିବା କରୁଛି'],
      'অসমীয়া': ['সামান্য বিষ', 'মজলীয়া কষ্ট', 'অত্যধিক বিষ', 'মাজে মাজে আহে আৰু যায়'],
      'اردو': ['ہلکا درد (قابل برداشت)', 'درمیانہ درد', 'شدید درد', 'وقفے وقفے سے ہوتا ہے'],
    },
  },
  {
    id: 'history',
    category: 'Medications & History',
    question: {
      English: 'Are you currently taking any regular medicines, or do you have any known drug allergies?',
      'हिन्दी': 'क्या आप कोई नियमित दवाई ले रहे हैं या आपको किसी दवा से एलर्जी है?',
      'বাংলা': 'আপনি কি কোনো নিয়মিত ওষুধ খাচ্ছেন বা কোনো ওষুধে অ্যালার্জি আছে?',
      'मराठी': 'तुम्ही सध्या कोणती नियमित औषधे घेत आहात का किंवा काही ऍलर्जी आहे का?',
      'తెలుగు': 'మీరు క్రమం తప్పకుండా ఏవైనా మందులు తీసుకుంటున్నారా లేదా అలర్జీలు ఉన్నాయా?',
      'தமிழ்': 'நீங்கள் ஏதேனும் வழக்கமான மருந்துகளை எடுத்துக்கொள்கிறீர்களா அல்லது ஒவ்வாமை உள்ளதா?',
      'ગુજરાતી': 'શું તમે કોઈ નિયમિત દવાઓ લો છો અથવા કોઈ દવા ની એલર્જી છે?',
      'ಕನ್ನಡ': 'ನೀವು ನಿಯಮಿತವಾಗಿ ಯಾವುದೇ ಔಷಧಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ ಅಥವಾ ಅಲರ್ಜಿ ಇದೆಯೇ?',
      'മലയാളം': 'നിങ്ങൾ പതിവായി എന്തെങ്കിലും മരുന്നുകൾ കഴിക്കുന്നുണ്ടോ അല്ലെങ്കിൽ അലർജിയുണ്ടോ?',
      'ਪੰਜਾਬੀ': 'ਕੀ ਤੁਸੀਂ ਕੋਈ ਦਵਾਈ ਰੈਗੂਲਰ ਲੈਂਦੇ ਹੋ ਜਾਂ ਕਿਸੇ ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ ਹੈ?',
      'ଓଡ଼ିଆ': 'ଆପଣ ନିୟମିତ କୌଣସି ଔଷଧ ଖାଉଛନ୍ତି କିମ୍ବା ଆଲର୍ଜି ଅଛି କି?',
      'অসমীয়া': 'আপুনি নিয়মিত কিবা ঔষধ খাই আছে নেকি বা কোনো এলাৰ্জি আছে নেকি?',
      'اردو': 'کیا آپ باقاعدگی سے کوئی دوا لے رہے ہیں یا کسی دوا سے الرجی ہے؟',
    },
    chips: {
      English: ['No regular medicines', 'BP / Diabetes medicines', 'Known drug allergy', 'Thyroid / Heart meds', 'Other'],
      'हिन्दी': ['कोई नियमित दवा नहीं', 'बीपी / शुगर की दवा', 'दवा से एलर्जी है', 'थायरॉयड / दिल की दवा', 'अन्य'],
      'বাংলা': ['কোনো নিয়মিত ওষুধ নেই', 'প্রেসার / সুগারের ওষুধ', 'ওষুধের অ্যালার্জি আছে', 'অন্যান্য'],
      'मराठी': ['कोणतेही नियमित औषध नाही', 'बीपी / मधुमेहाची औषधे', 'औषधाची ऍलर्जी आहे', 'इतर'],
      'తెలుగు': ['ఎలాంటి మందులు లేవు', 'బీపీ / షుగర్ మందులు', 'మందుల అలర్జీ ఉంది', 'ఇతర'],
      'தமிழ்': ['வழக்கமான மருந்துகள் இல்லை', 'பிபி / சர்க்கரை மருந்துகள்', 'மருந்து ஒவ்வாமை உள்ளது', 'மற்றவை'],
      'ગુજરાતી': ['કોઈ નિયમિત દવા નથી', 'બીપી / ડાયાબિટીસની દવા', 'દવા ની એલર્જી છે', 'અન્ય'],
      'ಕನ್ನಡ': ['ಯಾವುದೇ ಔಷಧಗಳಿಲ್ಲ', 'ಬಿಪಿ / ಶುಗರ್ ಔಷಧಗಳು', 'ಔಷಧ ಅಲರ್ಜಿ ಇದೆ', 'ಇತರ'],
      'മലയാളം': ['പതിവ് മരുന്നുകളൊന്നുമില്ല', 'ബിപി / ഷുഗർ മരുന്നുകൾ', 'മരുന്ന് അലർജിയുണ്ട്', 'മറ്റുള്ളവ'],
      'ਪੰਜਾਬੀ': ['ਕੋਈ ਰੈਗੂਲਰ ਦਵਾਈ ਨਹੀਂ', 'ਬੀਪੀ / ਸ਼ੂਗਰ ਦੀ ਦਵਾਈ', 'ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ ਹੈ', 'ਹੋਰ'],
      'ଓଡ଼ିଆ': ['କୌଣସି ନିୟମିତ ଔଷଧ ନାହିଁ', 'ପ୍ରେସର / ସୁଗାର ଔଷଧ', 'ଔଷଧ ଆଲର୍ଜି ଅଛି', 'ଅନ୍ୟାନ୍ୟ'],
      'অসমীয়া': ['কোনো নিয়মিত ঔষধ নাই', 'প্ৰেচাৰ / ডায়েবেটিছৰ ঔষধ', 'ঔষধৰ এলাৰ্জি আছে', 'অন্যান্য'],
      'اردو': ['کوئی باقاعدہ دوا نہیں', 'بلڈ پریشر / شوگر کی دوا', 'دوا سے الرجی ہے', 'دیگر'],
    },
  },
];

export function PatientTextChat({
  language,
  patientName = 'Ananya Sharma',
  patientAge = '34',
  onComplete,
  onSwitchToVoice,
}: {
  language: string;
  patientName?: string;
  patientAge?: string;
  onComplete: () => void;
  onSwitchToVoice: () => void;
}) {
  const currentLang = language || 'English';
  const t = getKioskTranslation(currentLang);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getLocalizedText = (dict: Record<string, string>) => {
    return dict[currentLang] || dict['English'] || Object.values(dict)[0];
  };

  const getLocalizedChips = (dict: Record<string, string[]>) => {
    return dict[currentLang] || dict['English'] || Object.values(dict)[0];
  };

  const initialQuestion = INTAKE_QUESTIONS[0];
  const initialAiMessage: ChatMessage = {
    id: 'msg-0',
    sender: 'ai',
    text: getLocalizedText(initialQuestion.question),
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    chips: getLocalizedChips(initialQuestion.chips),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialAiMessage]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [intakeSessionId, setIntakeSessionId] = useState<string | null>(null);

  useEffect(() => {
    async function initSession() {
      try {
        const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';
        const res = await fetch('/api/v1/intakes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patient_name: patientName,
            patient_age: parseInt(patientAge) || 35,
            patient_gender: 'FEMALE',
            language_code: langCode,
            workflow_type: 'GENERAL_CLINICAL',
            interaction_mode: 'TEXT',
            consent_given: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIntakeSessionId(data.id);
          localStorage.setItem('swasthya_active_intake_id', data.id);
          localStorage.setItem('swasthya_active_token', data.token || '');
        }
      } catch (err) {
        console.warn('Text session note:', err);
      }
    }
    initSession();
  }, [patientName, patientAge, currentLang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const handlePatientResponse = (answerText: string) => {
    if (!answerText.trim() || isThinking || isFinished) return;

    const trimmedAnswer = answerText.trim();
    const currentQ = INTAKE_QUESTIONS[currentStepIndex];
    const newAnswers = { ...answers, [currentQ.id]: trimmedAnswer };
    setAnswers(newAnswers);

    // Record into unified conversation store (used for Review Summary)
    recordIntakeAnswer(
      currentQ.id,
      trimmedAnswer,
      'text',
      currentQ.category,
      getLocalizedText(currentQ.question)
    );

    if (intakeSessionId) {
      const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';
      fetch(`/api/v1/intakes/${intakeSessionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: trimmedAnswer,
          input_mode: 'TEXT',
          language_code: langCode,
        }),
      }).catch(() => { });
    }

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: 'patient',
      text: trimmedAnswer,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);

    const nextIndex = currentStepIndex + 1;

    setTimeout(() => {
      if (nextIndex < INTAKE_QUESTIONS.length) {
        const nextQ = INTAKE_QUESTIONS[nextIndex];
        const nextAiMessage: ChatMessage = {
          id: `msg-ai-${Date.now()}`,
          sender: 'ai',
          text: getLocalizedText(nextQ.question),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          chips: getLocalizedChips(nextQ.chips),
        };
        setMessages((prev) => [...prev, nextAiMessage]);
        setCurrentStepIndex(nextIndex);
        setIsThinking(false);
      } else {
        const completionText =
          currentLang === 'हिन्दी'
            ? 'धन्यवाद! आपकी सभी जानकारी रिकॉर्ड कर ली गई है। अब आप अपनी पुरानी पर्ची या रिपोर्ट अपलोड कर सकते हैं।'
            : currentLang === 'বাংলা'
              ? 'ধন্যবাদ! আপনার সমস্ত তথ্য রেকর্ড করা হয়েছে। এখন আপনি আপনার পূর্বের প্রেসক্রিপশন বা রিপোর্ট যুক্ত করতে পারেন।'
              : currentLang === 'मराठी'
                ? 'धन्यवाद! तुमची सर्व माहिती नोंदवली गेली आहे. आता तुम्ही तुमचे मागील प्रिस्क्रिप्शन किंवा रिपोर्ट अपलोड करू शकता.'
                : currentLang === 'తెలుగు'
                  ? 'ధన్యవాదాలు! మీ వివరాలు నమోదు చేయబడ్డాయి. ఇప్పుడు మీరు మీ పాత ప్రిస్క్రిప్షన్ లేదా నివేదికలను అప్‌లోడ్ చేయవచ్చు.'
                  : currentLang === 'தமிழ்'
                    ? 'நன்றி! உங்கள் தகவல்கள் பதிவு செய்யப்பட்டுள்ளன. இப்போது நீங்கள் உங்கள் பழைய மருந்து சீட்டு அல்லது அறிக்கைகளை பதிவேற்றலாம்.'
                    : 'Thank you! Your intake responses have been recorded. You can now proceed to attach any previous prescriptions or reports.';

        const finalAiMessage: ChatMessage = {
          id: `msg-final-${Date.now()}`,
          sender: 'ai',
          text: completionText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, finalAiMessage]);
        setIsFinished(true);
        setIsThinking(false);
      }
    }, 650);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePatientResponse(inputText);
    }
  };

  const resetChat = () => {
    const freshQuestion = INTAKE_QUESTIONS[0];
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'ai',
        text: getLocalizedText(freshQuestion.question),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        chips: getLocalizedChips(freshQuestion.chips),
      },
    ]);
    setCurrentStepIndex(0);
    setInputText('');
    setIsThinking(false);
    setIsFinished(false);
    setAnswers({});
  };

  const latestAiMessage = [...messages].reverse().find((m) => m.sender === 'ai');
  const availableChips = !isFinished && !isThinking ? latestAiMessage?.chips : undefined;

  return (
    <div className="patient-chat-container">
      {/* Header Info */}
      <div className="chat-top-header">
        <div className="chat-ai-status">
          <span className="chat-bot-icon">
            <Bot size={18} />
          </span>
          <div>
            <div className="chat-bot-title">
              <strong>SwasthyaVaani AI</strong>
              <span className="ai-live-badge">
                <i className="ai-dot" /> Online
              </span>
            </div>
            <span className="chat-bot-sub">Clinical Intake Assistant · {currentLang}</span>
          </div>
        </div>

        <div className="chat-header-actions">
          <div className="chat-progress-pill">
            <span>
              {isFinished ? 'Completed' : `Question ${currentStepIndex + 1} of ${INTAKE_QUESTIONS.length}`}
            </span>
            <div className="chat-progress-bar">
              <div
                className="chat-progress-fill"
                style={{
                  width: isFinished
                    ? '100%'
                    : `${((currentStepIndex + 1) / INTAKE_QUESTIONS.length) * 100}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            className="chat-voice-toggle-btn"
            onClick={onSwitchToVoice}
            title={t.modeVoice}
          >
            <Mic size={14} /> <span>Voice</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-area">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`chat-bubble-row ${isAi ? 'ai-row' : 'patient-row'}`}>
              {isAi && (
                <div className="chat-avatar ai-avatar">
                  <Bot size={15} />
                </div>
              )}
              <div className="chat-bubble-content">
                {isAi && (
                  <div className="chat-bubble-kicker">
                    <Sparkles size={12} /> SwasthyaVaani Intake
                  </div>
                )}
                <div className={`chat-bubble ${isAi ? 'ai-bubble' : 'patient-bubble'}`}>
                  <p>{msg.text}</p>
                </div>
                <span className="chat-timestamp">{msg.time}</span>
              </div>
              {!isAi && (
                <div className="chat-avatar patient-avatar">
                  <User size={15} />
                </div>
              )}
            </div>
          );
        })}

        {/* AI Thinking Animation */}
        {isThinking && (
          <div className="chat-bubble-row ai-row">
            <div className="chat-avatar ai-avatar">
              <Bot size={15} />
            </div>
            <div className="chat-bubble-content">
              <div className="chat-bubble ai-bubble thinking-bubble">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Finish Summary Box */}
        {isFinished && (
          <div className="chat-completed-card">
            <div className="chat-completed-badge">
              <CheckCircle2 size={24} />
            </div>
            <h3>Intake Responses Recorded</h3>
            <p>
              Your symptoms and medical context have been prepared for Dr. Ananya Rao. You can now attach any
              previous reports or prescriptions.
            </p>
            <div className="chat-completed-actions">
              <button type="button" onClick={onComplete} className="chat-finish-btn">
                Continue to Records <ArrowRight size={16} />
              </button>
              <button type="button" onClick={resetChat} className="chat-reset-btn">
                <RotateCcw size={14} /> Start Over
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Chips */}
      {availableChips && availableChips.length > 0 && (
        <div className="chat-chips-container">
          <span className="chips-label">Quick Suggestions:</span>
          <div className="chips-list">
            {availableChips.map((chipText) => (
              <button
                key={chipText}
                type="button"
                className="chat-chip-btn"
                onClick={() => handlePatientResponse(chipText)}
              >
                {chipText}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text Input Bottom Bar */}
      <div className="chat-input-bar">
        <input
          type="text"
          className="chat-text-input"
          placeholder={
            currentLang === 'हिन्दी'
              ? 'अपना उत्तर यहाँ लिखें...'
              : currentLang === 'বাংলা'
                ? 'আপনার উত্তর এখানে লিখুন...'
                : currentLang === 'मराठी'
                  ? 'तुमचे उत्तर येथे टाईप करा...'
                  : 'Type your answer here...'
          }
          value={inputText}
          disabled={isFinished || isThinking}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="chat-send-btn"
          disabled={!inputText.trim() || isFinished || isThinking}
          onClick={() => handlePatientResponse(inputText)}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
