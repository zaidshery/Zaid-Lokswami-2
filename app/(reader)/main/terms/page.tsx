'use client';

import { FileText, Gavel, Globe2, Lock, ShieldCheck, UserCheck, Users } from 'lucide-react';
import LegalPageLayout, {
  type LegalPageHighlight,
  type LegalPageSection,
} from '@/components/ui/LegalPageLayout';
import { useAppStore } from '@/lib/store/appStore';

const EFFECTIVE_DATE = 'March 17, 2026';

const COPY = {
  en: {
    heroTag: 'Terms & Conditions',
    title: 'Terms and Conditions for Lokswami.com',
    subtitle:
      'These Terms and Conditions govern access to and use of Lokswami.com and its related services.',
    legalNote:
      'By using the Website, you agree to these Terms and Conditions and to comply with applicable laws.',
    highlightsTitle: 'Key Terms Areas',
    highlights: [
      { label: 'Website Use', icon: Users },
      { label: 'Content Rights', icon: Lock },
      { label: 'User Conduct', icon: ShieldCheck },
      { label: 'Liability', icon: Gavel },
    ] satisfies LegalPageHighlight[],
    sections: [
      {
        title: '1. Introduction',
        icon: FileText,
        body: [
          'These Terms govern access to and use of Lokswami.com and its services.',
          'By using the Website, you agree to these Terms.',
        ],
      },
      {
        title: '2. Eligibility',
        icon: Users,
        body: [
          'Users must be at least 18 years of age, or they must access the Website under the supervision of a legal guardian.',
        ],
      },
      {
        title: '3. User Obligations',
        icon: ShieldCheck,
        body: ['Users agree to the following obligations while using the Website:'],
        bullets: [
          'Provide accurate information where required',
          'Use the Website lawfully',
          'Not engage in misuse or illegal activities',
        ],
      },
      {
        title: '4. Intellectual Property',
        icon: Lock,
        body: [
          'All content on Lokswami.com is the property of Lokswami Newspaper and is protected under applicable laws.',
          'No content may be reproduced, copied, or redistributed without prior written permission.',
        ],
      },
      {
        title: '5. User-Generated Content',
        icon: UserCheck,
        body: [
          'By submitting content to the Website, users grant Lokswami a non-exclusive, royalty-free license to use, publish, and distribute that material.',
          'Users remain responsible for ensuring they have the necessary rights over any content they submit.',
        ],
      },
      {
        title: '6. Prohibited Activities',
        icon: ShieldCheck,
        body: ['Users shall not:'],
        bullets: [
          'Upload harmful or malicious content',
          'Violate any laws',
          'Attempt unauthorized access',
          'Use bots or scraping tools without permission',
        ],
      },
      {
        title: '7. Data Protection',
        icon: Globe2,
        body: [
          'User data is handled in accordance with the Privacy Policy of Lokswami.com.',
        ],
      },
      {
        title: '8. Termination',
        icon: Gavel,
        body: [
          'Lokswami reserves the right to suspend or terminate access to the Website without notice in case of violations of these Terms or misuse of the platform.',
        ],
      },
      {
        title: '9. Limitation of Liability',
        icon: Gavel,
        body: [
          'Lokswami shall not be liable for indirect, incidental, special, or consequential damages arising from use of the Website or services.',
        ],
      },
      {
        title: '10. Governing Law',
        icon: FileText,
        body: [
          'These Terms shall be governed by Indian law.',
          'Jurisdiction shall lie with the courts of Indore, Madhya Pradesh.',
        ],
      },
      {
        title: '11. Legal Compliance',
        icon: FileText,
        body: ['These policies are prepared in accordance with applicable Indian laws, including but not limited to:'],
        bullets: [
          'Information Technology Act, 2000',
          'Information Technology Rules, 2011',
          'Digital Personal Data Protection Act, 2023',
          'Copyright Act, 1957',
          'Indian Contract Act, 1872',
          'Consumer Protection Act, 2019',
        ],
      },
    ] satisfies LegalPageSection[],
    contactTitle: 'Contact Information',
    contactText:
      'If you have questions about these Terms and Conditions, please contact Lokswami using the details below.',
    contactRoleLabel: 'Legal and Compliance',
    contactRoleValue: 'Lokswami Newspaper',
    emailLabel: 'Email',
    addressLabel: 'Address',
    lastUpdatedLabel: 'Effective date',
  },
  hi: {
    heroTag: 'नियम और शर्तें',
    title: 'Lokswami.com के नियम और शर्तें',
    subtitle:
      'ये नियम और शर्तें Lokswami.com और उसकी संबंधित सेवाओं के उपयोग और पहुंच को नियंत्रित करती हैं।',
    legalNote:
      'वेबसाइट का उपयोग करके आप इन नियमों और लागू कानूनों का पालन करने के लिए सहमत होते हैं।',
    highlightsTitle: 'मुख्य नियम क्षेत्र',
    highlights: [
      { label: 'वेबसाइट उपयोग', icon: Users },
      { label: 'सामग्री अधिकार', icon: Lock },
      { label: 'उपयोगकर्ता आचरण', icon: ShieldCheck },
      { label: 'दायित्व', icon: Gavel },
    ] satisfies LegalPageHighlight[],
    sections: [
      {
        title: '1. परिचय',
        icon: FileText,
        body: [
          'ये नियम Lokswami.com और उसकी सेवाओं के उपयोग तथा पहुंच को नियंत्रित करते हैं।',
          'वेबसाइट का उपयोग करके आप इन नियमों से सहमत होते हैं।',
        ],
      },
      {
        title: '2. पात्रता',
        icon: Users,
        body: [
          'उपयोगकर्ता की आयु कम से कम 18 वर्ष होनी चाहिए, या वह किसी कानूनी अभिभावक की देखरेख में वेबसाइट का उपयोग करे।',
        ],
      },
      {
        title: '3. उपयोगकर्ता दायित्व',
        icon: ShieldCheck,
        body: ['वेबसाइट का उपयोग करते समय उपयोगकर्ता निम्न दायित्वों का पालन करेंगे:'],
        bullets: [
          'जहां आवश्यक हो, सही जानकारी प्रदान करना',
          'वेबसाइट का विधिसम्मत उपयोग करना',
          'दुरुपयोग या अवैध गतिविधियों में शामिल न होना',
        ],
      },
      {
        title: '4. बौद्धिक संपदा',
        icon: Lock,
        body: [
          'Lokswami.com पर उपलब्ध सभी सामग्री Lokswami Newspaper की संपत्ति है और लागू कानूनों द्वारा संरक्षित है।',
          'पूर्व लिखित अनुमति के बिना किसी भी सामग्री की प्रतिलिपि, पुनर्प्रकाशन या पुनर्वितरण नहीं किया जा सकता।',
        ],
      },
      {
        title: '5. उपयोगकर्ता-जनित सामग्री',
        icon: UserCheck,
        body: [
          'यदि उपयोगकर्ता वेबसाइट पर कोई सामग्री भेजते हैं, तो वे Lokswami को उस सामग्री का उपयोग, प्रकाशन और वितरण करने हेतु एक गैर-विशिष्ट, रॉयल्टी-फ्री लाइसेंस प्रदान करते हैं।',
          'भेजी गई सामग्री पर आवश्यक अधिकार होने की जिम्मेदारी उपयोगकर्ता की होगी।',
        ],
      },
      {
        title: '6. निषिद्ध गतिविधियां',
        icon: ShieldCheck,
        body: ['उपयोगकर्ता निम्न कार्य नहीं करेंगे:'],
        bullets: [
          'हानिकारक या दुर्भावनापूर्ण सामग्री अपलोड करना',
          'किसी भी कानून का उल्लंघन करना',
          'अनधिकृत पहुंच का प्रयास करना',
          'अनुमति के बिना बॉट्स या स्क्रैपिंग टूल्स का उपयोग करना',
        ],
      },
      {
        title: '7. डेटा संरक्षण',
        icon: Globe2,
        body: [
          'उपयोगकर्ता डेटा का प्रबंधन Lokswami.com की Privacy Policy के अनुसार किया जाता है।',
        ],
      },
      {
        title: '8. समाप्ति',
        icon: Gavel,
        body: [
          'इन नियमों के उल्लंघन या प्लेटफॉर्म के दुरुपयोग की स्थिति में Lokswami बिना पूर्व सूचना के वेबसाइट की पहुंच निलंबित या समाप्त कर सकता है।',
        ],
      },
      {
        title: '9. दायित्व की सीमा',
        icon: Gavel,
        body: [
          'वेबसाइट या सेवाओं के उपयोग से उत्पन्न अप्रत्यक्ष, आकस्मिक, विशेष या परिणामी नुकसान के लिए Lokswami उत्तरदायी नहीं होगा।',
        ],
      },
      {
        title: '10. लागू कानून',
        icon: FileText,
        body: [
          'ये नियम भारतीय कानूनों द्वारा नियंत्रित होंगे।',
          'अधिकार क्षेत्र इंदौर, मध्य प्रदेश की अदालतों का होगा।',
        ],
      },
      {
        title: '11. कानूनी अनुपालन',
        icon: FileText,
        body: ['ये नीतियां लागू भारतीय कानूनों के अनुरूप तैयार की गई हैं, जिनमें निम्न शामिल हैं:'],
        bullets: [
          'सूचना प्रौद्योगिकी अधिनियम, 2000',
          'सूचना प्रौद्योगिकी नियम, 2011',
          'डिजिटल पर्सनल डेटा प्रोटेक्शन अधिनियम, 2023',
          'कॉपीराइट अधिनियम, 1957',
          'भारतीय संविदा अधिनियम, 1872',
          'उपभोक्ता संरक्षण अधिनियम, 2019',
        ],
      },
    ] satisfies LegalPageSection[],
    contactTitle: 'संपर्क जानकारी',
    contactText:
      'यदि आपको इन नियमों और शर्तों के संबंध में कोई प्रश्न हो, तो नीचे दिए गए विवरणों के माध्यम से Lokswami से संपर्क करें।',
    contactRoleLabel: 'कानूनी और अनुपालन',
    contactRoleValue: 'Lokswami Newspaper',
    emailLabel: 'ईमेल',
    addressLabel: 'पता',
    lastUpdatedLabel: 'प्रभावी तिथि',
  },
} as const;

export default function TermsPage() {
  const { language } = useAppStore();
  const t = COPY[language];

  return (
    <LegalPageLayout
      heroTag={t.heroTag}
      title={t.title}
      subtitle={t.subtitle}
      legalNote={t.legalNote}
      lastUpdatedLabel={t.lastUpdatedLabel}
      lastUpdated={EFFECTIVE_DATE}
      highlightsTitle={t.highlightsTitle}
      highlights={t.highlights}
      sections={t.sections}
      contactTitle={t.contactTitle}
      contactText={t.contactText}
      contactRoleLabel={t.contactRoleLabel}
      contactRoleValue={t.contactRoleValue}
      emailLabel={t.emailLabel}
      addressLabel={t.addressLabel}
    />
  );
}
