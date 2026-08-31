import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Square,
  Volume2,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Keyboard,
  Play,
  Pause,
  Activity,
  User,
  Bot,
  AlertCircle
} from 'lucide-react';
import { getKioskTranslation } from '../lib/kioskTranslations';

export interface VoiceQuestionConfig {
  id: string;
  category: string;
  question: Record<string, string>;
  chips: Record<string, string[]>;
  sampleFallback: Record<string, string>;
}

export const INTAKE_QUESTIONS_VOICE: VoiceQuestionConfig[] = [
  {
    id: 'chief_complaint',
    category: 'Chief Complaint',
    question: {
      English: 'Hello! I am SwasthyaVaani, your AI health assistant. What main symptom or health concern brings you in today?',
      'हिन्दी': 'नमस्ते! मैं स्वास्थ्यवाणी हूँ, आपका AI स्वास्थ्य सहायक। आज आपको क्या मुख्य तकलीफ या लक्षण महसूस हो रहे हैं?',
      'मराठी': 'नमस्कार! मी स्वास्थ्यवाणी आहे, तुमचा AI आरोग्य सहाय्यक. आज तुम्हाला कोणता मुख्य त्रास किंवा लक्षण जाणवत आहे?',
      'বাংলা': 'নমস্কার! আমি স্বাস্থ্যবাণী, আপনার এআই স্বাস্থ্য সহকারী। আজকে আপনার প্রধান সমস্যা বা উপসর্গ কী?',
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
      English: ['Severe Chest Pain', 'High Fever & Chills', 'Persistent Cough', 'Stomach Cramps', 'Shortness of Breath'],
      'हिन्दी': ['सीने में तेज दर्द', 'तेज बुखार और ठंड', 'लगातार खांसी', 'पेट में दर्द', 'सांस लेने में तकलीफ'],
      'मराठी': ['छातीत तीव्र वेदना', 'तीव्र ताप आणि थंडी', 'सतत खोकला', 'पोटात दुखणे', 'दम लागणे'],
      'বাংলা': ['বুকে তীব্র ব্যথা', 'তীব্র জ্বর এবং কাঁপুনি', 'ক্রমাগত কাশি', 'পেটে ব্যথা', 'শ্বাসকষ্ট'],
      'తెలుగు': ['ఛాతీలో తీవ్రమైన నొప్పి', 'తీవ్రమైన జ్వరం', 'ఎడతెగని దగ్గు', 'కడుపు నొప్పి', 'శ్వాస ఆడకపోవడం'],
      'தமிழ்': ['மார்பில் கடுமையான வலி', 'காய்ச்சல் & குளிர்', 'தொடர் இருமல்', 'வயிற்று வலி', 'மூச்சுத்திணறல்'],
      'ગુજરાતી': ['છાતીમાં તીવ્ર દુખાવો', 'તાવ અને ઠંડી', 'સતત ખાંસી', 'પેટમાં દુખાવો', 'શ્વાસ લેવામાં તકલીફ'],
      'ಕನ್ನಡ': ['ಎದೆಯಲ್ಲಿ ತೀವ್ರ ನೋವು', 'ತೀವ್ರ ಜ್ವರ', 'ನಿರಂತರ ಕೆಮ್ಮು', 'ಹೊಟ್ಟೆ ನೋವು', 'ಉಸಿರಾಟದ ತೊಂದರೆ'],
      'മലയാളം': ['നെഞ്ചിൽ കഠിനമായ വേദന', 'പനിയും വിറയലും', 'വിട്ടുമാറാത്ത ചുമ', 'വയറുവേദന', 'ശ്വാസതടസ്സം'],
      'ਪੰਜਾਬੀ': ['ਛਾਤੀ ਵਿੱਚ ਤੇਜ਼ ਦਰਦ', 'ਤੇਜ਼ ਬੁਖਾਰ', 'ਲਗਾਤਾਰ ਖੰਘ', 'ਪੇਟ ਦਰਦ', 'ਸਾਹ ਚੜ੍ਹਨਾ'],
      'ଓଡ଼ିଆ': ['ଛାତିରେ ପ୍ରବଳ ଯନ୍ତ୍ରଣା', 'ଜ୍ୱର ଓ ଥଣ୍ଡା', 'କାଶ', 'ପେଟ ଯନ୍ତ୍ରଣା', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ'],
      'অসমীয়া': ['বুকুত তীব্ৰ বিষ', 'জ্বৰ আৰু ঠাণ্ডা', 'কাহ', 'পেটৰ বিষ', 'উশাহৰ সমস্যা'],
      'اردو': ['سینے میں شدید درد', 'تیز بخار اور سردی', 'مسلسل کھانسی', 'پیٹ کا درد', 'سانس پھولنا'],
    },
    sampleFallback: {
      English: 'I have had severe chest discomfort and feeling breathless.',
      'हिन्दी': 'मुझे सीने में भारीपन और सांस लेने में तकलीफ हो रही है।',
      'मराठी': 'मला छातीत जडपणा आणि श्वास घेण्यास त्रास होत आहे.',
      'বাংলা': 'আমার বুকে ভারী ভাব এবং শ্বাসকষ্ট হচ্ছে।',
      'తెలుగు': 'నాకు ఛాతీలో భారంగా ఉంది మరియు శ్వాస తీసుకోవడం కష్టంగా ఉంది.',
      'தமிழ்': 'எனக்கு மார்பில் பாரமாகவும் மூச்சு விடுவதில் சிரமமாகவும் உள்ளது.',
      'ગુજરાતી': 'મને છાતીમાં ભારેપણું અને શ્વાસ લેવામાં તકલીફ થાય છે.',
      'ಕನ್ನಡ': 'ನನಗೆ ಎದೆಯಲ್ಲಿ ಭಾರವೆನಿಸುತ್ತಿದೆ ಮತ್ತು ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ.',
      'മലയാളം': 'എനിക്ക് നെഞ്ചിൽ ഭാരവും ശ്വാസതടസ്സവും അനുഭവപ്പെടുന്നു.',
      'ਪੰਜਾਬੀ': 'ਮੈਨੂੰ ਛਾਤੀ ਵਿੱਚ ਭਾਰੀਪਣ ਅਤੇ ਸਾਹ ਲੈਣ ਵਿੱਚ ਦਿੱਕਤ ਹੋ ਰਹੀ ਹੈ।',
      'ଓଡ଼ିଆ': 'ମୋତେ ଛାତିରେ ଭାରି ଲାଗୁଛି ଏବଂ ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି।',
      'অসমীয়া': 'মোৰ বুকুত ভাৰ অনুভৱ হৈছে আৰু উশাহ লোৱাত কষ্ট হৈছে।',
      'اردو': 'مجھے سینے میں گھٹن اور سانس لینے میں دشواری ہو رہی ہے۔',
    }
  },
  {
    id: 'onset',
    category: 'Onset & Duration',
    question: {
      English: 'When did this discomfort first start, and did it begin suddenly or gradually?',
      'हिन्दी': 'यह तकलीफ सबसे पहले कब शुरू हुई थी, और क्या यह अचानक हुई या धीरे-धीरे?',
      'मराठी': 'हा त्रास सर्वात आधी कधी सुरू झाला, आणि तो अचानक सुरू झाला की हळूहळू?',
      'বাংলা': 'এই সমস্যাটি প্রথম কখন শুরু হয়েছিল, এবং হঠাৎ হয়েছিল নাকি ধীরে ধীরে?',
      'తెలుగు': 'ఈ సమస్య మొదట ఎప్పుడు ప్రారంభమైంది, అకస్మాత్తుగా వచ్చిందా లేదా నెమ్మదిగానా?',
      'தமிழ்': 'இந்த பிரச்சனை எப்போது தொடங்கியது, திடீரென தொடங்கியதா அல்லது மெதுவாகவா?',
      'ગુજરાતી': 'આ તકલીફ ક્યારે શરૂ થઈ, અચાનક થઈ કે ધીમે ધીમે?',
      'ಕನ್ನಡ': 'ಈ ಸಮಸ್ಯೆ ಯಾವಾಗ ಪ್ರಾರಂಭವಾಯಿತು, ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಪ್ರಾರಂಭವಾಯಿತೇ ಅಥವಾ ನಿಧಾನವಾಗಿಯೇ?',
      'മലയാളം': 'ഈ പ്രശ്നം എപ്പോഴാണ് തുടങ്ങിയത്, പെട്ടെന്ന് തുടങ്ങിയതാണോ അതോ പതുക്കെയോ?',
      'ਪੰਜਾਬੀ': 'ਇਹ ਤਕਲੀਫ਼ ਕਦੋਂ ਸ਼ੁਰੂ ਹੋਈ, ਅਚਾਨਕ ਹੋਈ ਜਾਂ ਹੌਲੀ-ਹੌਲੀ?',
      'ଓଡ଼ିଆ': 'ଏହି ସମସ୍ୟା ପ୍ରଥମେ କେବେ ଆରମ୍ଭ ହେଲା, ହଠାତ୍ ହେଲା ନା ଧୀରେ ଧୀରେ?',
      'অসমীয়া': 'এই সমস্যাটো কেতিয়া আৰম্ভ হৈছিল, হঠাৎ হৈছিল নে লাহে লাহে?',
      'اردو': 'یہ تکلیف کب شروع ہوئی، اچانک ہوئی یا آہستہ آہستہ؟',
    },
    chips: {
      English: ['Suddenly this morning', 'Started 2–3 days ago', 'Since last night', 'More than 1 week ago', 'Gradually worsening'],
      'हिन्दी': ['आज सुबह अचानक', '2-3 दिन पहले से', 'कल रात से', 'एक हफ्ते से अधिक', 'धीरे-धीरे बढ़ रहा है'],
      'मराठी': ['आज सकाळी अचानक', '२-३ दिवसांपूर्वी', 'काल रात्रीपासून', '१ आठवड्यापेक्षा जास्त', 'हळूहळू वाढत आहे'],
      'বাংলা': ['আজ সকালে হঠাৎ', '২-৩ দিন আগে', 'গতকাল রাত থেকে', '১ সপ্তাহের বেশি', 'ধীরে ধীরে বাড়ছে'],
      'తెలుగు': ['ఈ ఉదయం అకస్మాత్తుగా', '2-3 రోజుల క్రితం', 'నిన్న రాత్రి నుండి', '1 వారం కంటే ఎక్కువ', 'నెమ్మదిగా పెరుగుతోంది'],
      'தமிழ்': ['இன்று காலை திடீரென', '2-3 நாட்களுக்கு முன்பு', 'நேற்று இரவு முதல்', '1 வாரத்திற்கும் மேல்', 'மெதுவாக அதிகரிக்கிறது'],
      'ગુજરાતી': ['આજે સવારે અચાનક', '૨-૩ દિવસ પહેલાં', 'ગઈકાલે રાતથી', '૧ અઠવાડિયાથી વધુ', 'ધીમે ધીમે વધે છે'],
      'ಕನ್ನಡ': ['ಇಂದು ಬೆಳಗ್ಗೆ ಇದ್ದಕ್ಕಿದ್ದಂತೆ', '೨-೩ ದಿನಗಳ ಹಿಂದೆ', 'ನಿನ್ನೆ ರಾತ್ರಿಯಿಂದ', '೧ ವಾರಕ್ಕೂ ಹೆಚ್ಚು', 'ನಿಧಾನವಾಗಿ ಹೆಚ್ಚುತ್ತಿದೆ'],
      'മലയാളം': ['ഇന്ന് രാവിലെ പെട്ടെന്ന്', '2-3 ദിവസം മുൻപ്', 'ഇന്നലെ രാത്രി മുതൽ', '1 ആഴ്ചയിൽ കൂടുതൽ', 'പതുക്കെ കൂടുന്നു'],
      'ਪੰਜਾਬੀ': ['ਅੱਜ ਸਵੇਰੇ ਅਚਾਨਕ', '2-3 ਦਿਨ ਪਹਿਲਾਂ', 'ਕੱਲ੍ਹ ਰਾਤ ਤੋਂ', '1 ਹਫ਼ਤੇ ਤੋਂ ਵੱਧ', 'ਹੌਲੀ-ਹੌਲੀ ਵਧ ਰਿਹਾ ਹੈ'],
      'ଓଡ଼ିଆ': ['ଆଜି ସକାଳେ ହଠାତ୍', '୨-୩ ଦିନ ପୂର୍ବରୁ', 'ଗତକାଲି ରାତିରୁ', '୧ ସପ୍ତାହରୁ ଅଧିକ', 'ଧୀରେ ଧୀରେ ବଢୁଛି'],
      'অসমীয়া': ['আজি পুৱা হঠাৎ', '২-৩ দিন আগতে', 'কালি ৰাতিৰ পৰা', '১ সপ্তাহতকৈ বেছি', 'লাহে লাহে বাঢ়িছে'],
      'اردو': ['آج صبح اچانک', '2-3 دن پہلے', 'کل رات سے', 'ایک ہفتے سے زیادہ', 'آہستہ آہستہ بڑھ رہا ہے'],
    },
    sampleFallback: {
      English: 'It started suddenly about 3 days ago and has been constant.',
      'हिन्दी': 'यह लगभग 3 दिन पहले अचानक शुरू हुआ था और लगातार बना हुआ है।',
      'मराठी': 'हे साधारण ३ दिवसांपूर्वी अचानक सुरू झाले आणि सतत होत आहे.',
      'বাংলা': 'এটি প্রায় ৩ দিন আগে হঠাৎ শুরু হয়েছিল এবং একটানা চলছে।',
      'తెలుగు': 'ఇది సుమారు 3 రోజుల క్రితం అకస్మాత్తుగా ప్రారంభమైంది.',
      'தமிழ்': 'இது சுமார் 3 நாட்களுக்கு முன்பு திடீரென தொடங்கியது.',
      'ગુજરાતી': 'આ આશરે ૩ દિવસ પહેલાં અચાનક શરૂ થયું હતું.',
      'ಕನ್ನಡ': 'ಇದು ಸುಮಾರು ೩ ದಿನಗಳ ಹಿಂದೆ ಇದ್ದಕ್ಕಿದ್ದಂತೆ ಪ್ರಾರಂಭವಾಯಿತು.',
      'മലയാളം': 'ഇത് ഏകദേശം 3 ദിവസം മുൻപ് പെട്ടെന്ന് തുടങ്ങിയതാണ്.',
      'ਪੰਜਾਬੀ': 'ਇਹ ਲਗਭਗ 3 ਦਿਨ ਪਹਿਲਾਂ ਅਚਾਨਕ ਸ਼ੁਰੂ ਹੋਇਆ ਸੀ।',
      'ଓଡ଼ିଆ': 'ଏହା ପ୍ରାୟ ୩ ଦିନ ପୂର୍ବରୁ ହଠାତ୍ ଆରମ୍ଭ ହୋଇଥିଲା।',
      'অসমীয়া': 'এইটো প্ৰায় ৩ দিন আগতে হঠাৎ আৰম্ভ হৈছিল।',
      'اردو': 'یہ تقریباً 3 دن پہلے اچانک شروع ہوا تھا۔',
    }
  },
  {
    id: 'severity',
    category: 'Severity (1–10 Scale)',
    question: {
      English: 'On a scale of 1 to 10, how severe is your pain or discomfort right now?',
      'हिन्दी': '1 से 10 के पैमाने पर, आप अपनी तकलीफ या दर्द की तीव्रता को कितना बताएंगे?',
      'मराठी': '१ ते १० च्या प्रमाणात, तुम्ही तुमच्या वेदनेची किंवा त्रासाची तीव्रता किती सांगाल?',
      'বাংলা': '১ থেকে ১০ এর স্কেলে, আপনি আপনার ব্যথার তীব্রতাকে কত নম্বর দেবেন?',
      'తెలుగు': '1 నుండి 10 స్కేల్‌లో, మీ నొప్పి లేదా బాధ తీవ్రత ఎంత?',
      'தமிழ்': '1 முதல் 10 அளவுகோலில், உங்கள் வலியின் தீவிரம் எவ்வளவு?',
      'ગુજરાતી': '૧ થી ૧૦ ના સ્કેલ પર, તમારા દુખાવાની તીવ્રતા કેટલી છે?',
      'ಕನ್ನಡ': '೧ ರಿಂದ ೧೦ ರ ಮಾಪಕದಲ್ಲಿ, ನಿಮ್ಮ ನೋವಿನ ತೀವ್ರತೆ ಎಷ್ಟು?',
      'മലയാളം': '1 മുതൽ 10 വരെയുള്ള സ്കെയിലിൽ, നിങ്ങളുടെ വേദനയുടെ തീവ്രത എത്രയാണ്?',
      'ਪੰਜਾਬੀ': '1 ਤੋਂ 10 ਦੇ ਪੈਮਾਨੇ ਤੇ, ਤੁਸੀਂ ਆਪਣੇ ਦਰਦ ਨੂੰ ਕਿੰਨਾ ਨੰਬਰ ਦਿਓਗੇ?',
      'ଓଡ଼ିଆ': '୧ ରୁ ୧୦ ମାପକରେ, ଆପଣଙ୍କ ଯନ୍ତ୍ରଣାର ତୀବ୍ରତା କେତେ?',
      'অসমীয়া': '১ ৰ পৰা ১০ ৰ ভিতৰত, আপোনাৰ বিষৰ মাত্ৰা কিমান?',
      'اردو': '1 سے 10 کے پیمانے پر، آپ اپنے درد کی شدت کو کیا نمبر دیں گے؟',
    },
    chips: {
      English: ['Mild (3/10)', 'Moderate (5/10)', 'Severe (8/10)', 'Unbearable (10/10)', 'Comes in waves'],
      'हिन्दी': ['हल्का (3/10)', 'मध्यम (5/10)', 'तेज़ (8/10)', 'असहनीय (10/10)', 'रुक-रुक कर आता है'],
      'मराठी': ['कमी (३/१०)', 'मध्यम (५/१०)', 'तीव्र (८/१०)', 'असह्य (१०/१०)', 'कमी जास्त होते'],
      'বাংলা': ['হালকা (৩/১০)', 'মাঝারি (৫/১০)', 'তীব্র (৮/১০)', 'অসহ্য (১০/১০)', 'মাঝে মাঝে বাড়ে'],
      'తెలుగు': ['తేలికపాటి (3/10)', 'మధ్యస్థం (5/10)', 'తీవ్రం (8/10)', 'భరించలేనిది (10/10)', 'తరచూ వస్తోంది'],
      'தமிழ்': ['லேசானது (3/10)', 'மிதமானது (5/10)', 'கடுமையானது (8/10)', 'தாங்க முடியாதது (10/10)', 'விட்டு விட்டு வருகிறது'],
      'ગુજરાતી': ['હળવો (૩/૧૦)', 'મધ્યમ (૫/૧૦)', 'તીવ્ર (૮/૧૦)', 'અસહ્ય (૧૦/૧૦)', 'વચ્ચે વચ્ચે થાય છે'],
      'ಕನ್ನಡ': ['ಸ್ವಲ್ಪ (೩/೧೦)', 'ಮಧ್ಯಮ (೫/೧೦)', 'ತೀವ್ರ (೮/೧೦)', 'ತಾಳಲಾರದ್ದು (೧೦/೧೦)', 'ಬಂದು ಹೋಗುತ್ತದೆ'],
      'മലയാളം': ['കുറഞ്ഞത് (3/10)', 'ഇടത്തരം (5/10)', 'കഠിനം (8/10)', 'സഹിക്കാൻ പറ്റാത്തത് (10/10)', 'ഇടയ്ക്കിടെ വരുന്നു'],
      'ਪੰਜਾਬੀ': ['ਹਲਕਾ (3/10)', 'ਦਰਮਿਆਨਾ (5/10)', 'ਤੇਜ਼ (8/10)', 'ਅਸਹਿਣਯੋਗ (10/10)', 'ਰੁਕ ਰੁਕ ਕੇ ਹੁੰਦਾ ਹੈ'],
      'ଓଡ଼ିଆ': ['ଅଳ୍ପ (୩/୧୦)', 'ମଧ୍ୟମ (୫/୧୦)', 'ତୀବ୍ର (୮/୧୦)', 'ଅସହ୍ୟ (୧୦/୧୦)', 'ବାରମ୍ବାର ଆସୁଛି'],
      'অসমীয়া': ['সামান্য (৩/১০)', 'মজলীয়া (৫/১০)', 'তীব্ৰ (৮/১০)', 'অসহ্য (১০/১০)', 'মাজে মাজে আহে'],
      'اردو': ['ہلکا (3/10)', 'درمیانہ (5/10)', 'شدید (8/10)', 'ناقابل برداشت (10/10)', 'وقفے وقفے سے ہوتا ہے'],
    },
    sampleFallback: {
      English: 'The pain is very intense, around 8 out of 10.',
      'हिन्दी': 'दर्द बहुत तेज है, 10 में से लगभग 8 के बराबर।',
      'मराठी': 'वेदना खूप तीव्र आहेत, १० पैकी साधारण ८.',
      'বাংলা': 'ব্যথা খুবই তীব্র, ১০ এর মধ্যে প্রায় ৮।',
      'తెలుగు': 'నొప్పి చాలా తీవ్రంగా ఉంది, 10 కి దాదాపు 8.',
      'தமிழ்': 'வலி மிகவும் அதிகமாக உள்ளது, 10க்கு 8 இருக்கும்.',
      'ગુજરાતી': 'દુખાવો ઘણો તીવ્ર છે, ૧૦ માંથી ૮ જેટલો.',
      'ಕನ್ನಡ': 'ನೋವು ತುಂಬಾ ತೀವ್ರವಾಗಿದೆ, ೧೦ ರಲ್ಲಿ ಸುಮಾರು ೮.',
      'മലയാളം': 'വേദന വളരെ കൂടുതലാണ്, 10-ൽ 8 വരും.',
      'ਪੰਜਾਬੀ': 'ਦਰਦ ਬਹੁਤ ਤੇਜ਼ ਹੈ, 10 ਵਿੱਚੋਂ ਲਗਭਗ 8.',
      'ଓଡ଼ିଆ': 'ଯନ୍ତ୍ରଣା ବହୁତ ତୀବ୍ର, ୧୦ ରୁ ପ୍ରାୟ ୮।',
      'অসমীয়া': 'বিষ বহুত বেছি, ১০ ৰ ভিতৰত প্ৰায় ৮।',
      'اردو': 'درد بہت شدید ہے، 10 میں سے تقریباً 8۔',
    }
  },
  {
    id: 'radiation',
    category: 'Location & Radiation',
    question: {
      English: 'Where exactly is the pain located, and does it spread or radiate to your arm, shoulder, neck, or back?',
      'हिन्दी': 'दर्द ठीक किस जगह पर है, और क्या यह आपके हाथ, कंधे, गर्दन या पीठ की तरफ भी फैलता है?',
      'मराठी': 'वेदना नेमक्या कोणत्या ठिकाणी आहेत, आणि त्या हात, खांदा, मान किंवा पाठीकडे पसरतात का?',
      'বাংলা': 'ব্যথা ঠিক কোথায় হচ্ছে, এবং এটি কি আপনার হাত, কাঁধ, ঘাড় বা পিঠের দিকে ছড়াচ্ছে?',
      'తెలుగు': 'నొప్పి సరిగ్గా ఎక్కడ ఉంది, అది చేయి, భుజం, మెడ లేదా వెనుకకు పాకుతుందా?',
      'தமிழ்': 'வலி சரியாக எங்கே உள்ளது, அது கை, தோள்பட்டை, கழுத்து அல்லது முதுகிற்கு பரவுகிறதா?',
      'ગુજરાતી': 'દુખાવો બરાબર કઈ જગ્યાએ છે, અને તે હાથ, ખભા, ગરદન કે પીઠ તરફ ફેલાય છે?',
      'ಕನ್ನಡ': 'ನೋವು ನಿಖರವಾಗಿ ಎಲ್ಲಿದೆ, ಮತ್ತು ಅದು ತೋಳು, ಭುಜ, ಕುತ್ತಿಗೆ ಅಥವಾ ಬೆನ್ನಿಗೆ ಹರಡುತ್ತದೆಯೇ?',
      'മലയാളം': 'വേദന എവിടെയാണ് ഉള്ളത്, അത് കൈ, തോൾ, കഴുത്ത്, അല്ലെങ്കിൽ പുറത്തേക്ക് പടരുന്നുണ്ടോ?',
      'ਪੰਜਾਬੀ': 'ਦਰਦ ਠੀਕ ਕਿਸ ਜਗ੍ਹਾ ਹੈ, ਅਤੇ ਕੀ ਇਹ ਬਾਂਹ, ਮੋਢੇ, ਗਰਦਨ ਜਾਂ ਪਿੱਠ ਵੱਲ ਫੈਲਦਾ ਹੈ?',
      'ଓଡ଼ିଆ': 'ଯନ୍ତ୍ରଣା ଠିକ୍ କେଉଁଠି ହେଉଛି, ଏବଂ ଏହା ହାତ, କାନ୍ଧ, ବେକ ବା ପିଠି ଆଡ଼କୁ ଯାଉଛି କି?',
      'অসমীয়া': 'বিষটো সঠিকভাৱে ক\'ত হৈছে, আৰু এইটো হাত, কান্ধ, ডিঙি বা পিঠিলৈ বিয়পিছে নেকি?',
      'اردو': 'درد کس جگہ ہے، اور کیا یہ بازو، کندھے، گردن یا کمر کی طرف پھیلتا ہے؟',
    },
    chips: {
      English: ['Left chest radiating to left arm', 'Upper abdomen / Epigastric', 'Middle chest / Pressure', 'Spreads to back & shoulder', 'Localized in one spot only'],
      'हिन्दी': ['बाएं सीने से बाएं हाथ तक', 'ऊपरी पेट में जलन', 'सीने के बीच में दबाव', 'पीठ और कंधे की तरफ', 'सिर्फ एक ही जगह पर'],
      'मराठी': ['डाव्या छातीतून डाव्या हाताकडे', 'पोटाच्या वरच्या भागात', 'छातीच्या मध्यभागी दाब', 'पाठीत आणि खांद्यात', 'फक्त एकाच ठिकाणी'],
      'বাংলা': ['বাম বুক থেকে বাম হাতে', 'উপরের পেটে জ্বালা', 'বুকের মাঝে চাপ', 'পিঠ ও কাঁধের দিকে', 'শুধু এক জায়গায়'],
      'తెలుగు': ['ఎడమ ఛాతీ నుండి ఎడమ చేతికి', 'పై పొట్టలో', 'ఛాతీ మధ్యలో ఒత్తిడి', 'వెనుక మరియు భుజానికి', 'ఒకే చోట'],
      'தமிழ்': ['இடது மார்பில் இருந்து இடது கைக்கு', 'மேல் வயிற்றில்', 'மார்பின் நடுவில் அழுத்தம்', 'முதுகு மற்றும் தோள்பட்டைக்கு', 'ஒரே இடத்தில்'],
      'ગુજરાતી': ['ડાબી છાતીથી ડાબા હાથ તરફ', 'ઉપરના પેટમાં', 'છાતીની વચ્ચે દબાણ', 'પીઠ અને ખભા તરફ', 'ફક્ત એક જ જગ્યાએ'],
      'ಕನ್ನಡ': ['ಎಡ ಎದೆಯಿಂದ ಎಡ ತೋಳಿಗೆ', 'ಮೇಲ್ಭಾಗದ ಹೊಟ್ಟೆಯಲ್ಲಿ', 'ಎದೆಯ ಮಧ್ಯದಲ್ಲಿ ಒತ್ತಡ', 'ಬೆನ್ನು ಮತ್ತು ಭುಜಕ್ಕೆ', 'ಕೇವಲ ಒಂದು ಜಾಗದಲ್ಲಿ'],
      'മലയാളം': ['ഇടത് നെഞ്ചിൽ നിന്ന് ഇടത് കൈയിലേക്ക്', 'വയറിന്റെ മുകൾഭാഗത്ത്', 'നെഞ്ചിന്റെ മധ്യത്തിൽ ഭാരം', 'പുറത്തേക്കും തോളിലേക്കും', 'ഒരിടത്തു മാത്രം'],
      'ਪੰਜਾਬੀ': ['ਖੱਬੀ ਛਾਤੀ ਤੋਂ ਖੱਬੀ ਬਾਂਹ ਵੱਲ', 'ਉੱਪਰਲੇ ਪੇਟ ਵਿੱਚ', 'ਛਾਤੀ ਦੇ ਵਿਚਕਾਰ ਦਬਾਅ', 'ਪਿੱਠ ਅਤੇ ਮੋਢੇ ਵੱਲ', 'ਸਿਰਫ਼ ਇੱਕ ਥਾਂ ਤੇ'],
      'ଓଡ଼ିଆ': ['ବାମ ଛାତିରୁ ବାମ ହାତକୁ', 'ଉପର ପେଟରେ', 'ଛାତି ମଝିରେ ଚାପ', 'ପିଠି ଓ କାନ୍ଧ ଆଡ଼କୁ', 'କେବଳ ଗୋଟିଏ ସ୍ଥାନରେ'],
      'অসমীয়া': ['বাওঁ ফালৰ বুকুৰ পৰা বাওঁ হাতলৈ', 'ওপৰ পেটত', 'বুকুৰ মাজত চাপ', 'পিঠি আৰু কান্ধলৈ', 'কেৱল এঠাইত'],
      'اردو': ['بائیں سینے سے بائیں بازو تک', 'اوپری پیٹ میں', 'سینے کے درمیان دباؤ', 'کمر اور کندھے کی طرف', 'صرف ایک جگہ'],
    },
    sampleFallback: {
      English: 'The pressure is in the center of my chest and radiates down my left arm.',
      'हिन्दी': 'सीने के बीच में भारी दबाव है और यह दर्द मेरे बाएं हाथ में नीचे तक जा रहा है।',
      'मराठी': 'छातीच्या मध्यभागी खूप दाब आहे आणि वेदना डाव्या हातात पसरत आहेत.',
      'বাংলা': 'বুকের মাঝে খুব চাপ লাগছে এবং ব্যথা বাম হাতে ছড়িয়ে পড়ছে।',
      'తెలుగు': 'ఛాతీ మధ్యలో ఒత్తిడి ఉంది మరియు నొప్పి ఎడమ చేతికి పాకుతోంది.',
      'தமிழ்': 'மார்பின் நடுவில் அழுத்தம் உள்ளது மற்றும் வலி இடது கையில் பரவுகிறது.',
      'ગુજરાતી': 'છાતીની વચ્ચે દબાણ છે અને દુખાવો ડાબા હાથમાં ફેલાય છે.',
      'ಕನ್ನಡ': 'ಎದೆಯ ಮಧ್ಯದಲ್ಲಿ ಒತ್ತಡವಿದೆ ಮತ್ತು ನೋವು ಎಡ ತೋಳಿಗೆ ಹರಡುತ್ತಿದೆ.',
      'മലയാളം': 'നെഞ്ചിന്റെ മധ്യത്തിൽ സമ്മർദ്ദമുണ്ട്, വേദന ഇടത് കൈയിലേക്ക് പടരുന്നു.',
      'ਪੰਜਾਬੀ': 'ਛਾਤੀ ਦੇ ਵਿਚਕਾਰ ਦਬਾਅ ਹੈ ਅਤੇ ਦਰਦ ਖੱਬੀ ਬਾਂਹ ਵਿੱਚ ਫੈਲ ਰਿਹਾ ਹੈ।',
      'ଓଡ଼ିଆ': 'ଛାତି ମଝିରେ ଚାପ ଅଛି ଏବଂ ଯନ୍ତ୍ରଣା ବାମ ହାତକୁ ଯାଉଛି।',
      'অসমীয়া': 'বুকুৰ মাজত চাপ অনুভৱ হৈছে আৰু বাওঁ হাতলৈ বিষ বিয়পিছে।',
      'اردو': 'سینے کے درمیان میں دباؤ ہے اور درد بائیں بازو میں پھیل رہا ہے۔',
    }
  },
  {
    id: 'associated_symptoms',
    category: 'Associated Symptoms',
    question: {
      English: 'Are you experiencing any accompanying symptoms like excessive sweating, dizziness, nausea, fever, or shortness of breath?',
      'हिन्दी': 'क्या आपको इसके साथ कोई अन्य लक्षण जैसे अधिक पसीना आना, चक्कर, उल्टी जैसा लगना, बुखार या सांस फूलना महसूस हो रहा है?',
      'मराठी': 'यासोबत तुम्हाला भरपूर घाम येणे, चक्कर येणे, मळमळणे, ताप किंवा दम लागणे अशी काही लक्षणे जाणवत आहेत का?',
      'বাংলা': 'এর সাথে কি অতিরিক্ত ঘাম হওয়া, মাথা ঘোরা, বমি বমি ভাব, জ্বর বা শ্বাসকষ্টের মতো কোনো উপসর্গ আছে?',
      'తెలుగు': 'దీనితో పాటు అధికంగా చెమటలు పట్టడం, తలతిరగడం, వికారం, జ్వరం లేదా శ్వాస ఆడకపోవడం వంటి లక్షణాలు ఉన్నాయా?',
      'தமிழ்': 'இதனுடன் அதிக வியர்வை, தலைசுற்றல், குமட்டல், காய்ச்சல் அல்லது மூச்சுத்திணறல் போன்ற அறிகுறிகள் உள்ளதா?',
      'ગુજરાતી': 'આની સાથે વધારે પરસેવો થવો, ચક્કર આવવા, ઉલ્ટી જેવું થવું, તાવ કે શ્વાસ ફૂલવા જેવા કોઈ લક્ષણો છે?',
      'ಕನ್ನಡ': 'ಇದರ ಜೊತೆಗೆ ಅತಿಯಾದ ಬೆವರು, ತಲೆತಿರುಗುವಿಕೆ, ವಾಕರಿಕೆ, ಜ್ವರ ಅಥವಾ ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆಯೇ?',
      'മലയാളം': 'ഇതോടൊപ്പം അമിതമായ വിയർപ്പ്, തലകറക്കം, ഓക്കാനം, പനി, അല്ലെങ്കിൽ ശ്വാസതടസ്സം എന്നിവ ഉണ്ടോ?',
      'ਪੰਜਾਬੀ': 'ਕੀ ਇਸ ਦੇ ਨਾਲ ਬਹੁਤ ਜ਼ਿਆਦਾ ਪਸੀਨਾ, ਚੱਕਰ ਆਉਣੇ, ਉਲਟੀ ਆਉਣਾ, ਬੁਖਾਰ ਜਾਂ ਸਾਹ ਚੜ੍ਹਨਾ ਮਹਿਸੂਸ ਹੋ ਰਿਹਾ ਹੈ?',
      'ଓଡ଼ିଆ': 'ଏହା ସହିତ ଅଧିକ ଝାଳ ବାହାରିବା, ମୁଣ୍ଡ ବୁଲାଇବା, ବାନ୍ତି ଲାଗିବା, ଜ୍ୱର କିମ୍ବା ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ ହେଉଛି କି?',
      'অসমীয়া': 'ইয়াৰ লগত অধিক ঘাম ওলোৱা, মূৰ ঘূৰোৱা, বমি ভাব, জ্বৰ বা উশাহৰ সমস্যা আছে নেকি?',
      'اردو': 'کیا اس کے ساتھ زیادہ پسینہ آنا، چکر آنا، متلی، بخار یا سانس کا پھولنا محسوس ہو رہا ہے؟',
    },
    chips: {
      English: ['Cold sweating & Dizziness', 'Shortness of breath', 'Nausea / Feeling sick', 'High fever & Chills', 'No other symptoms'],
      'हिन्दी': ['ठंडा पसीना और चक्कर', 'सांस फूलना', 'उल्टी जैसा लगना', 'तेज बुखार और कंपकंपी', 'कोई अन्य लक्षण नहीं'],
      'मराठी': ['थंड घाम आणि चक्कर', 'दम लागणे', 'मळमळणे', 'तीव्र ताप', 'इतर काही नाही'],
      'বাংলা': ['ঠাণ্ডা ঘাম ও মাথা ঘোরা', 'শ্বাসকষ্ট', 'বমি বমি ভাব', 'তীব্র জ্বর', 'অন্য কোনো উপসর্গ নেই'],
      'తెలుగు': ['చల్లటి చెమటలు & తలతిరగడం', 'శ్వాస ఆడకపోవడం', 'వికారం', 'తీవ్ర జ్వరం', 'ఇతర లక్షణాలు లేవు'],
      'தமிழ்': ['குளிர்ந்த வியர்வை & தலைசுற்றல்', 'மூச்சுத்திணறல்', 'குமட்டல்', 'காய்ச்சல்', 'வேறு அறிகுறிகள் இல்லை'],
      'ગુજરાતી': ['ઠંડો પરસેવો અને ચક્કર', 'શ્વાસ ફૂલવો', 'ઉબકા આવવા', 'તાવ', 'અન્ય કોઈ લક્ષણ નથી'],
      'ಕನ್ನಡ': ['ತಣ್ಣನೆಯ ಬೆವರು & ತಲೆತಿರುಗುವಿಕೆ', 'ಉಸಿರಾಟದ ತೊಂದರೆ', 'ವಾಕರಿಕೆ', 'ಜ್ವರ', 'ಬೇರೆ ಲಕ್ಷಣಗಳಿಲ್ಲ'],
      'മലയാളം': ['തണുത്ത വിയർപ്പും തലകറക്കവും', 'ശ്വാസതടസ്സം', 'ഓക്കാനം', 'പനി', 'മറ്റ് ലക്ഷണങ്ങളൊന്നുമില്ല'],
      'ਪੰਜਾਬੀ': ['ਠੰਢਾ ਪਸੀਨਾ ਅਤੇ ਚੱਕਰ', 'ਸਾਹ ਚੜ੍ਹਨਾ', 'ਜੀ ਕੱਚਾ ਹੋਣਾ', 'ਬੁਖਾਰ', 'ਹੋਰ ਕੋਈ ਲੱਛਣ ਨਹੀਂ'],
      'ଓଡ଼ିଆ': ['ଥଣ୍ଡା ଝାଳ ଓ ମୁଣ୍ଡ ବୁଲାଇବା', 'ନିଶ୍ୱାସ ନେବାରେ କଷ୍ଟ', 'ବାନ୍ତି ଭାବ', 'ଜ୍ୱର', 'ଅନ୍ୟ କୌଣସି ଲକ୍ଷଣ ନାହିଁ'],
      'অসমীয়া': ['ঠাণ্ডা ঘাম আৰু মূৰ ঘূৰোৱা', 'উশাহৰ কষ্ট', 'বমি ভাব', 'জ্বৰ', 'অন্য কোনো লক্ষণ নাই'],
      'اردو': ['ٹھنڈا پسینہ اور چکر آنا', 'سانس پھولنا', 'متلی کی کیفیت', 'تیز بخار', 'کوئی اور علامت نہیں'],
    },
    sampleFallback: {
      English: 'Yes, I am breaking into cold sweats and feeling short of breath.',
      'हिन्दी': 'हाँ, मुझे बहुत ठंडा पसीना आ रहा है और सांस फूल रही है।',
      'मराठी': 'हो, मला खूप थंड घाम येत आहे आणि दम लागत आहे.',
      'বাংলা': 'হ্যাঁ, আমার খুব ঠাণ্ডা ঘাম হচ্ছে এবং শ্বাস নিতে কষ্ট হচ্ছে।',
      'తెలుగు': 'అవును, నాకు చల్లటి చెమటలు పడుతున్నాయి మరియు శ్వాస ఆడటం లేదు.',
      'தமிழ்': 'ஆம், எனக்கு குளிர்ந்த வியர்வை வருகிறது மற்றும் மூச்சுத்திணறல் உள்ளது.',
      'ગુજરાતી': 'હા, મને ખૂબ ઠંડો પરસેવો થાય છે અને શ્વાસ લેવામાં તકલીફ થાય છે.',
      'ಕನ್ನಡ': 'ಹೌದು, ನನಗೆ ತಣ್ಣನೆಯ ಬೆವರು ಬರುತ್ತಿದೆ ಮತ್ತು ಉಸಿರಾಟ ಕಷ್ಟವಾಗುತ್ತಿದೆ.',
      'മലയാളം': 'അതെ, എനിക്ക് തണുത്ത വിയർപ്പും ശ്വാസതടസ്സവും അനുഭവപ്പെടുന്നുണ്ട്.',
      'ਪੰਜਾਬੀ': 'ਹਾਂ, ਮੈਨੂੰ ਬਹੁਤ ਠੰਢਾ ਪਸੀਨਾ ਆ ਰਿਹਾ ਹੈ ਅਤੇ ਸਾਹ ਚੜ੍ਹ ਰਿਹਾ ਹੈ।',
      'ଓଡ଼ିଆ': 'ହଁ, ମୋତେ ବହୁତ ଥଣ୍ଡା ଝାଳ ବାହାରୁଛି ଏବଂ ନିଶ୍ୱାସ କଷ୍ଟ ହେଉଛି।',
      'অসমীয়া': 'হয়, মোৰ ঠাণ্ডা ঘাম ওলাইছে আৰু উশাহ ল\'বলৈ কষ্ট হৈছে।',
      'اردو': 'جی ہاں، مجھے ٹھنڈا پسینہ آ رہا ہے اور سانس پھول رہی ہے۔',
    }
  },
  {
    id: 'history',
    category: 'Medications & Health History',
    question: {
      English: 'Are you currently taking any regular medications for BP, diabetes, or heart, or do you have any known drug allergies?',
      'हिन्दी': 'क्या आप वर्तमान में बीपी, शुगर, दिल या थायरॉयड की कोई नियमित दवाई ले रहे हैं, या आपको किसी दवा से एलर्जी है?',
      'मराठी': 'तुम्ही सध्या बीपी, मधुमेह, हृदयविकार किंवा थायरॉईडची कोणती नियमित औषधे घेत आहात का, किंवा काही ऍलर्जी आहे का?',
      'বাংলা': 'আপনি কি বর্তমানে প্রেশার, ডায়াবেটিস, হার্ট বা থাইরয়েডের কোনো নিয়মিত ওষুধ খাচ্ছেন বা কোনো ওষুধে অ্যালার্জি আছে?',
      'తెలుగు': 'మీరు ప్రస్తుతం బీపీ, షుగర్, గుండె సంబంధిత మందులు తీసుకుంటున్నారా లేదా మందుల అలర్జీ ఉందా?',
      'தமிழ்': 'நீங்கள் தற்போது பிபி, சர்க்கரை, இதய மருந்துகளை எடுத்துக்கொள்கிறீர்களா அல்லது மருந்து ஒவ்வாமை உள்ளதா?',
      'ગુજરાતી': 'શું તમે હાલમાં બીપી, ડાયાબિટીસ કે હૃદય ની નિયમિત દવાઓ લો છો અથવા કોઈ દવા ની એલર્જી છે?',
      'ಕನ್ನಡ': 'ನೀವು ಪ್ರಸ್ತುತ ಬಿಪಿ, ಮಧುಮೇಹ ಅಥವಾ ಹೃದಯದ ಔಷಧಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ ಅಥವಾ ಅಲರ್ಜಿ ಇದೆಯೇ?',
      'മലയാളം': 'നിങ്ങൾ ഇപ്പോൾ ബിപി, ഷുഗർ, ഹൃദയസംബന്ധമായ മരുന്നുകൾ കഴിക്കുന്നുണ്ടോ അല്ലെങ്കിൽ അലർജിയുണ്ടോ?',
      'ਪੰਜਾਬੀ': 'ਕੀ ਤੁਸੀਂ ਬੀਪੀ, ਸ਼ੂਗਰ ਜਾਂ ਦਿਲ ਦੀ ਕੋਈ ਰੈਗੂਲਰ ਦਵਾਈ ਲੈ ਰਹੇ ਹੋ ਜਾਂ ਕਿਸੇ ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ ਹੈ?',
      'ଓଡ଼ିଆ': 'ଆପଣ ବର୍ତ୍ତମାନ ପ୍ରେସର, ସୁଗାର ବା ହୃଦରୋଗର କୌଣସି ନିୟମିତ ଔଷଧ ଖାଉଛନ୍ତି କିମ୍ବା ଆଲର୍ଜି ଅଛି କି?',
      'অসমীয়া': 'আপুনি বৰ্তমান প্ৰেচাৰ, ডায়েবেটিছ বা হাৰ্টৰ ঔষধ খাই আছে নেকি বা কোনো এলাৰ্জি আছে নেকি?',
      'اردو': 'کیا آپ بلڈ پریشر، شوگر یا دل کی کوئی باقاعدہ دوا لے رہے ہیں یا کسی دوا سے الرجی ہے؟',
    },
    chips: {
      English: ['Hypertension (BP) Meds', 'Diabetes / Insulin', 'Known Penicillin/Sulfa Allergy', 'Thyroid / Cholesterol Meds', 'No prior medical conditions'],
      'हिन्दी': ['बीपी (रक्तचाप) की दवा', 'डायबिटीज (शुगर) / इंसुलिन', 'दवा से एलर्जी है (पेनिसिलिन)', 'थायरॉयड / कोलेस्ट्रॉल की दवा', 'कोई पुरानी बीमारी नहीं'],
      'मराठी': ['बीपी चे औषध', 'मधुमेह / इन्सुलिन', 'औषधाची ऍलर्जी आहे', 'थायरॉईड / कोलेस्टेरॉल', 'कोणताही जुना आजार नाही'],
      'বাংলা': ['প্রেসারের ওষুধ', 'ডায়াবেটিস / ইনসুলিন', 'ওষুধের অ্যালার্জি আছে', 'থাইরয়েড / কোলেস্টেরল', 'কোনো রোগ নেই'],
      'తెలుగు': ['బీపీ మందులు', 'షుగర్ / ఇన్సులిన్', 'మందుల అలర్జీ ఉంది', 'థైరాయిడ్ మందులు', 'ఎలాంటి వ్యాధులు లేవు'],
      'தமிழ்': ['பிபி மருந்துகள்', 'சர்க்கரை / இன்சுலின்', 'மருந்து ஒவ்வாமை உள்ளது', 'தைராய்டு மருந்துகள்', 'முந்தைய நோய்கள் இல்லை'],
      'ગુજરાતી': ['બીપી ની દવા', 'ડાયાબિટીસ / ઇન્સ્યુલિન', 'દવા ની એલર્જી છે', 'થાઇરોઇડ ની દવા', 'કોઈ બીમારી નથી'],
      'ಕನ್ನಡ': ['ಬಿಪಿ ಔಷಧಗಳು', 'ಮಧುಮೇಹ / ಇನ್ಸುಲಿನ್', 'ಔಷಧ ಅಲರ್ಜಿ ಇದೆ', 'ಥೈರಾಯ್ಡ್ ಔಷಧಗಳು', 'ಯಾವುದೇ ರೋಗಗಳಿಲ್ಲ'],
      'മലയാളം': ['ബിപി മരുന്നുകൾ', 'ഷുഗർ / ഇൻസുലിൻ', 'മരുന്ന് അലർജിയുണ്ട്', 'തൈറോയ്ഡ് മരുന്നുകൾ', 'മറ്റ് അസുഖങ്ങളൊന്നുമില്ല'],
      'ਪੰਜਾਬੀ': ['ਬੀਪੀ ਦੀ ਦਵਾਈ', 'ਸ਼ੂਗਰ / ਇੰਸੁਲਿਨ', 'ਦਵਾਈ ਤੋਂ ਐਲਰਜੀ ਹੈ', 'ਥਾਇਰਾਇਡ ਦੀ ਦਵਾਈ', 'ਕੋਈ ਪੁਰਾਣੀ ਬਿਮਾਰੀ ਨਹੀਂ'],
      'ଓଡ଼ିଆ': ['ପ୍ରେସର ଔଷଧ', 'ସୁଗାର / ଇନସୁଲିନ', 'ଔଷଧ ଆଲର୍ଜି ଅଛି', 'ଥାଇରଏଡ ଔଷଧ', 'କୌଣସି ରୋଗ ନାହିଁ'],
      'অসমীয়া': ['প্ৰেচাৰৰ ঔষধ', 'ডায়েবেটিছ / ইনচুলিন', 'ঔষধৰ এলাৰ্জি আছে', 'থাইৰয়ডৰ ঔষধ', 'কোনো বেমাৰ নাই'],
      'اردو': ['بلڈ پریشر کی دوا', 'شوگر / انسولین', 'دوا سے الرجی ہے', 'تھائرائیڈ کی دوا', 'کوئی پرانی بیماری نہیں'],
    },
    sampleFallback: {
      English: 'I take Telmisartan 40mg daily for high blood pressure. No known drug allergies.',
      'हिन्दी': 'मैं हाई ब्लड प्रेशर के लिए रोजाना टेल्मिसार्टन 40mg लेता हूँ। कोई ज्ञात एलर्जी नहीं है।',
      'मराठी': 'मी हाय बीपी साठी रोज टेल्मिसार्टन ४०mg घेतो. मला कोणतीही ऍलर्जी नाही.',
      'বাংলা': 'আমি হাই প্রেশারের জন্য প্রতিদিন টেলমিসারটান ৪০mg খাই। কোনো অ্যালার্জি নেই।',
      'తెలుగు': 'నేను హై బీపీ కోసం రోజూ టెల్మిసార్టాన్ 40mg తీసుకుంటాను.',
      'தமிழ்': 'நான் உயர் இரத்த அழுத்தத்திற்கு தினமும் டெல்மிசார்டன் 40mg எடுத்துக்கொள்கிறேன்.',
      'ગુજરાતી': 'હું હાઈ બીપી માટે રોજ ટેલ્મિસારટન ૪૦mg લઉં છું.',
      'ಕನ್ನಡ': 'ನಾನು ಅಧಿಕ ರಕ್ತದೊತ್ತಡಕ್ಕೆ ಪ್ರತಿದಿನ ಟೆಲ್ಮಿಸಾರ್ಟನ್ ೪೦mg ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ.',
      'മലയാളം': 'ഹൈ ബിപിക്ക് ഞാൻ ദിവസവും ടെൽമിസാർട്ടൻ 40mg കഴിക്കാറുണ്ട്.',
      'ਪੰਜਾਬੀ': 'ਮੈਂ ਹਾਈ ਬੀਪੀ ਲਈ ਰੋਜ਼ਾਨਾ ਟੈਲਮਿਸਾਰਟਨ 40mg ਲੈਂਦਾ ਹਾਂ।',
      'ଓଡ଼ିଆ': 'ମୁଁ ହାଇ ପ୍ରେସର ପାଇଁ ପ୍ରତିଦିନ ଟେଲମିସାର୍ଟନ ୪୦mg ନେଉଛି।',
      'অসমীয়া': 'মই হাই প্ৰেচাৰৰ বাবে নিতৌ টেলমিচাৰটান ৪০mg খাই আছোঁ।',
      'اردو': 'میں ہائی بلڈ پریشر کے لیے روزانہ ٹیلمیسارٹن 40mg لیتا ہوں۔',
    }
  }
];

function getLanguageCodeTag(lang: string): string {
  switch (lang) {
    case 'हिन्दी':
    case 'Hindi':
      return 'hi-IN';
    case 'मराठी':
    case 'Marathi':
      return 'mr-IN';
    case 'বাংলা':
    case 'Bengali':
      return 'bn-IN';
    case 'தமிழ்':
    case 'Tamil':
      return 'ta-IN';
    case 'తెలుగు':
    case 'Telugu':
      return 'te-IN';
    case 'ગુજરાતી':
    case 'Gujarati':
      return 'gu-IN';
    case 'ಕನ್ನಡ':
    case 'Kannada':
      return 'kn-IN';
    case 'മലയാളം':
    case 'Malayalam':
      return 'ml-IN';
    case 'ਪੰਜਾਬੀ':
    case 'Punjabi':
      return 'pa-IN';
    case 'ଓଡ଼ିଆ':
    case 'Odia':
      return 'or-IN';
    case 'অসমীয়া':
    case 'Assamese':
      return 'as-IN';
    case 'اردو':
    case 'Urdu':
      return 'ur-IN';
    default:
      return 'en-IN';
  }
}

export function PatientVoiceChat({
  language,
  patientName = 'Ananya Sharma',
  patientAge = '34',
  onComplete,
  onSwitchToText,
}: {
  language: string;
  patientName?: string;
  patientAge?: string;
  onComplete: () => void;
  onSwitchToText: () => void;
}) {
  const currentLang = language || 'English';
  const t = getKioskTranslation(currentLang);
  const langTag = getLanguageCodeTag(currentLang);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSpeakingAi, setIsSpeakingAi] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [intakeSessionId, setIntakeSessionId] = useState<string | null>(null);

  // History of completed Q&A pairs
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ questionText: string; answerText: string; category: string; audioUrl?: string }>
  >([]);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const currentQ = INTAKE_QUESTIONS_VOICE[currentQuestionIndex] || INTAKE_QUESTIONS_VOICE[0];
  const questionText = currentQ.question[currentLang] || currentQ.question['English'] || Object.values(currentQ.question)[0];
  const activeChips = currentQ.chips[currentLang] || currentQ.chips['English'] || Object.values(currentQ.chips)[0];

  // 1. Initialize Intake Session in Backend
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
            interaction_mode: 'VOICE',
            consent_given: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setIntakeSessionId(data.id);
        }
      } catch (err) {
        console.warn('[SwasthyaVaani Voice] Backend session init note:', err);
      }
    }
    initSession();
  }, [patientName, patientAge, currentLang]);

  // 2. Speak Question on Question Change
  useEffect(() => {
    if (!isFinished && questionText) {
      speakQuestionText(questionText);
    }
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [currentQuestionIndex, isFinished]);

  const speakQuestionText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langTag;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Select natural voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (v) => v.lang.toLowerCase().startsWith(langTag.toLowerCase().slice(0, 2))
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => setIsSpeakingAi(true);
      utterance.onend = () => {
        setIsSpeakingAi(false);
        // Automatically start listening after speaking question for hands-free UX
        startListening();
      };
      utterance.onerror = () => setIsSpeakingAi(false);

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis notice:', err);
      setIsSpeakingAi(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeakingAi(false);
  };

  // 3. Audio Waveform Visualizer
  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const barWidth = (canvas.width / bufferLength) * 2.2;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (canvas.height - 8) + 4;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#c98e20');
        gradient.addColorStop(1, '#eaba61');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, (canvas.height - barHeight) / 2, barWidth - 1, barHeight);
        x += barWidth;
      }
    };
    render();
  };

  // 4. Start Listening / Mic Recording
  const startListening = async () => {
    stopSpeaking();
    setLiveTranscript('');
    setAudioUrl(null);
    audioChunksRef.current = [];
    setElapsedSeconds(0);

    // Try Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = langTag;

        recognition.onresult = (event: any) => {
          let text = '';
          for (let i = 0; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          setLiveTranscript(text);
        };

        recognition.onerror = (e: any) => {
          console.warn('Speech recognition notice:', e);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err) {
        console.warn('SpeechRecognition initialization notice:', err);
      }
    }

    // Try Media Stream / Waveform
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          drawWaveform();
        }

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
          }
        };

        mediaRecorder.start(250);
      }
    } catch (err) {
      console.warn('Microphone access note:', err);
    }

    setIsListening(true);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopListening = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      } catch (e) {}
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
    }

    setIsListening(false);
  };

  // 5. Submit Answer & Advance to Next Question
  const handleAnswerSubmit = async (overrideAnswer?: string) => {
    stopListening();
    stopSpeaking();

    const answerToSubmit = (
      overrideAnswer ||
      liveTranscript ||
      currentQ.sampleFallback[currentLang] ||
      currentQ.sampleFallback['English']
    ).trim();

    if (!answerToSubmit) return;

    setIsProcessing(true);

    // Save to local conversation history
    setConversationHistory((prev) => [
      ...prev,
      {
        category: currentQ.category,
        questionText,
        answerText: answerToSubmit,
        audioUrl: audioUrl || undefined,
      },
    ]);

    // Send answer to Backend API session if active
    if (intakeSessionId) {
      try {
        const langCode = currentLang === 'हिन्दी' ? 'hi' : currentLang === 'मराठी' ? 'mr' : 'en';
        await fetch(`/api/v1/intakes/${intakeSessionId}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            raw_text: answerToSubmit,
            input_mode: 'VOICE',
            language_code: langCode,
            audio_duration_seconds: elapsedSeconds || 4.5,
          }),
        });
      } catch (err) {
        console.warn('Backend answer sync notice:', err);
      }
    }

    setLiveTranscript('');
    setIsProcessing(false);

    const nextIndex = currentQuestionIndex + 1;

    if (nextIndex < INTAKE_QUESTIONS_VOICE.length) {
      setCurrentQuestionIndex(nextIndex);
    } else {
      // Intake Completed
      setIsFinished(true);
      const completionSpeech =
        currentLang === 'हिन्दी'
          ? 'धन्यवाद! आपकी सभी 6 जानकारियां रिकॉर्ड कर ली गई हैं। अब आप अपनी पुरानी पर्ची या रिपोर्ट जोड़ सकते हैं।'
          : currentLang === 'मराठी'
          ? 'धन्यवाद! तुमचे सर्व 6 प्रश्नांची उत्तरे नोंदवली गेली आहेत. आता तुम्ही तुमची कागदपत्रे जोडू शकता.'
          : currentLang === 'বাংলা'
          ? 'ধন্যবাদ! আপনার সমস্ত উত্তর রেকর্ড করা হয়েছে। এখন আপনি আপনার পূর্বের রিপোর্ট যুক্ত করতে পারেন।'
          : 'Thank you! All 6 clinical intake questions have been recorded. You can now proceed to attach previous prescriptions or reports.';
      speakQuestionText(completionSpeech);
    }
  };

  const handleChipClick = (chipText: string) => {
    setLiveTranscript(chipText);
    handleAnswerSubmit(chipText);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="kiosk-card voice-intake-container max-w-3xl mx-auto w-full">
      {/* Top Header & Progress */}
      <div className="flex items-center justify-between border-b border-[#e8ece7] pb-4 mb-5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#173e35]/10 text-[#173e35] text-xs font-semibold uppercase tracking-wider font-mono">
            <Sparkles size={13} className="text-[#c98e20]" />
            AI Voice Intake · {currentLang}
          </span>
          <span className="text-xs font-medium text-[#5c726a]">
            Patient: <b>{patientName}</b> ({patientAge} yrs)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#173e35]">
            {isFinished
              ? '6 of 6 Completed'
              : `Question ${currentQuestionIndex + 1} of ${INTAKE_QUESTIONS_VOICE.length}`}
          </span>
          <div className="flex gap-1">
            {INTAKE_QUESTIONS_VOICE.map((_, idx) => (
              <span
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx < currentQuestionIndex || isFinished
                    ? 'w-4 bg-[#1f5b4e]'
                    : idx === currentQuestionIndex
                    ? 'w-6 bg-[#eaba61]'
                    : 'w-2 bg-[#dcd7c5]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {!isFinished ? (
        <div className="flex flex-col items-center text-center">
          {/* Section Kicker */}
          <span className="section-kicker mb-1 text-[#c98e20] uppercase font-mono text-xs tracking-wider">
            {currentQ.category}
          </span>

          {/* Current Question Text */}
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#173e35] leading-snug my-2 max-w-2xl">
            &ldquo;{questionText}&rdquo;
          </h2>

          {/* AI Speaking Indicator & Replay Button */}
          <div className="flex items-center gap-2 mt-2 mb-6">
            <button
              type="button"
              onClick={() => speakQuestionText(questionText)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#f4f7f5] hover:bg-[#e6eeea] text-[#173e35] text-xs font-medium border border-[#c4d6cb] transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className={isSpeakingAi ? 'animate-spin' : ''} />
              <span>{isSpeakingAi ? 'SwasthyaVaani is speaking…' : 'Repeat audio'}</span>
            </button>
            {isSpeakingAi && (
              <span className="flex items-center gap-1 text-xs font-mono text-[#c98e20]">
                <Volume2 size={15} className="animate-pulse" /> Spoken in {currentLang}
              </span>
            )}
          </div>

          {/* Central Interactive Voice Orb / Waveform Visualizer */}
          <div className="relative my-4 flex flex-col items-center justify-center">
            {isListening ? (
              <div className="flex flex-col items-center gap-3">
                <canvas
                  ref={canvasRef}
                  width={280}
                  height={70}
                  className="h-16 w-64 rounded-2xl bg-[#173e35]/5 border border-[#c4d6cb] shadow-inner"
                />
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#a83d35] animate-pulse">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a83d35]" />
                  LISTENING · {formatTimer(elapsedSeconds)} · SPEAK NOW
                </div>
                <button
                  type="button"
                  onClick={() => handleAnswerSubmit()}
                  className="flex items-center gap-2 rounded-full bg-[#a83d35] hover:bg-[#8e322b] px-7 py-3 font-bold text-sm text-white shadow-lg transition-transform transform active:scale-95 cursor-pointer"
                >
                  <Square size={16} /> Tap when done speaking
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={startListening}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-[#1f5b4e] hover:bg-[#17473d] text-white shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 cursor-pointer ring-8 ring-[#1f5b4e]/15"
                >
                  <Mic size={38} className="transition-transform group-hover:scale-110" />
                </button>
                <span className="text-xs font-semibold text-[#173e35]">
                  Tap microphone to answer with your voice
                </span>
              </div>
            )}
          </div>

          {/* Real-time Live Voice Transcript Box */}
          {liveTranscript && (
            <div className="w-full max-w-xl my-3 p-4 rounded-2xl bg-[#fffdfa] border-2 border-[#eaba61] text-left shadow-sm">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-[#c98e20] mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} /> LIVE VOICE TRANSCRIPT
                </span>
                <span>{currentLang}</span>
              </div>
              <p className="text-base font-sans text-[#173e35] font-medium leading-relaxed">
                {liveTranscript}
              </p>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleAnswerSubmit()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1f5b4e] hover:bg-[#17473d] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <span>Confirm this answer</span> <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Quick Click / Tap Assistance Chips in Patient's Language */}
          <div className="w-full max-w-xl my-4">
            <p className="text-xs font-semibold text-[#7b9086] uppercase font-mono tracking-wider mb-2">
              Or tap a common response ({currentLang}):
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {activeChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(chip)}
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#fffdfa] border border-[#d8ddd3] hover:border-[#eaba61] text-xs font-medium text-[#173e35] shadow-xs transition-all hover:scale-102 cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Fallback & Switch to Text Mode */}
          <div className="mt-4 pt-4 border-t border-[#e8ece7] w-full flex items-center justify-between text-xs text-[#5c726a]">
            <button
              type="button"
              onClick={onSwitchToText}
              className="flex items-center gap-1.5 text-[#1f5b4e] hover:underline font-semibold cursor-pointer"
            >
              <Keyboard size={15} /> Prefer typing on screen? Switch to text
            </button>
            <button
              type="button"
              onClick={() => handleAnswerSubmit()}
              className="flex items-center gap-1 text-[#7b9086] hover:text-[#173e35] font-medium cursor-pointer"
            >
              Skip question <ArrowRight size={13} />
            </button>
          </div>
        </div>
      ) : (
        /* Completion State */
        <div className="flex flex-col items-center text-center py-6">
          <div className="h-16 w-16 rounded-full bg-[#1f5b4e]/10 text-[#1f5b4e] flex items-center justify-center mb-3">
            <CheckCircle2 size={36} />
          </div>
          <span className="section-kicker font-mono text-xs uppercase text-[#1f5b4e] font-bold">
            Intake Completed
          </span>
          <h2 className="text-3xl font-serif font-bold text-[#173e35] my-2">
            All 6 clinical questions recorded!
          </h2>
          <p className="text-sm text-[#5c726a] max-w-lg mb-6">
            SwasthyaVaani has extracted your symptoms, timeline, and health history in {currentLang}.
            Your doctor will review this structured clinical summary.
          </p>

          <button
            type="button"
            onClick={onComplete}
            className="flex items-center gap-2 rounded-full bg-[#1f5b4e] hover:bg-[#17473d] px-8 py-3.5 text-base font-bold text-white shadow-xl transition-transform hover:scale-105 cursor-pointer"
          >
            <span>Proceed to Attach Medical Records</span> <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Conversation Timeline & Past Answers */}
      {conversationHistory.length > 0 && (
        <div className="mt-8 pt-5 border-t border-[#e8ece7]">
          <h4 className="text-xs font-mono font-bold uppercase text-[#7b9086] tracking-wider mb-3">
            Recorded Answers ({conversationHistory.length} of {INTAKE_QUESTIONS_VOICE.length})
          </h4>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {conversationHistory.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[#f7f9f8] border border-[#d8ddd3] text-xs flex flex-col gap-1"
              >
                <div className="flex items-center justify-between text-[#7b9086] font-mono text-[11px]">
                  <span>
                    Q{idx + 1}: {item.category}
                  </span>
                  <span className="flex items-center gap-1 text-[#1f5b4e] font-semibold">
                    <CheckCircle2 size={12} /> Captured via voice
                  </span>
                </div>
                <div className="font-semibold text-[#173e35]">{item.questionText}</div>
                <div className="font-medium text-[#1f5b4e] bg-white p-2 rounded-lg border border-[#e0ebe8] mt-1">
                  &ldquo;{item.answerText}&rdquo;
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
