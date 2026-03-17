'use client';

import { AlertTriangle, FileWarning, Globe2, Scale, ShieldCheck, TriangleAlert } from 'lucide-react';
import LegalPageLayout, {
  type LegalPageHighlight,
  type LegalPageSection,
} from '@/components/ui/LegalPageLayout';
import { useAppStore } from '@/lib/store/appStore';

const EFFECTIVE_DATE = 'March 17, 2026';

const COPY = {
  en: {
    heroTag: 'Disclaimer',
    title: 'Disclaimer for Lokswami.com',
    subtitle:
      'This Disclaimer explains the scope, limitations, and legal boundaries of the information published on Lokswami.com.',
    legalNote:
      'The information provided on Lokswami.com is for general informational purposes only and does not constitute legal, financial, or professional advice.',
    highlightsTitle: 'Key Disclaimer Areas',
    highlights: [
      { label: 'General Use', icon: FileWarning },
      { label: 'Content Accuracy', icon: ShieldCheck },
      { label: 'External Links', icon: Globe2 },
      { label: 'Liability Limits', icon: Scale },
    ] satisfies LegalPageHighlight[],
    sections: [
      {
        title: '1. General Disclaimer',
        icon: FileWarning,
        body: [
          'The information provided on Lokswami.com is for general informational purposes only.',
          'Nothing published on the Website should be treated as legal, financial, or professional advice.',
        ],
      },
      {
        title: '2. Content Accuracy',
        icon: ShieldCheck,
        body: [
          'All content is published in good faith based on sources believed to be reliable at the time of publication.',
          'Lokswami does not guarantee the completeness, accuracy, or timeliness of information available on the Website.',
        ],
      },
      {
        title: '3. Third-Party Links',
        icon: Globe2,
        body: [
          'Lokswami.com may contain links to external websites or services. We do not control and do not take responsibility for the content, availability, or practices of third-party websites.',
        ],
      },
      {
        title: '4. Limitation of Liability',
        icon: Scale,
        body: [
          'To the maximum extent permitted by law, Lokswami, its owner, editorial team, employees, or affiliates shall not be liable for any direct or indirect damages arising from the use of the Website.',
        ],
      },
      {
        title: '5. Indemnity',
        icon: AlertTriangle,
        body: [
          'Users agree to indemnify and hold harmless Lokswami and its representatives against any claims, losses, or liabilities arising from misuse of the Website or violation of applicable laws.',
        ],
      },
      {
        title: '6. Governing Law and Jurisdiction',
        icon: TriangleAlert,
        body: [
          'This Disclaimer shall be governed by the laws of India.',
          'Jurisdiction shall lie exclusively with the courts of Indore, Madhya Pradesh.',
        ],
      },
    ] satisfies LegalPageSection[],
    contactTitle: 'Contact Us',
    contactText:
      'If you have any questions regarding this Disclaimer or need clarification on published information, please contact Lokswami using the details below.',
    contactRoleLabel: 'Editorial and Legal Contact',
    contactRoleValue: 'Lokswami Newspaper',
    emailLabel: 'Email',
    addressLabel: 'Address',
    lastUpdatedLabel: 'Effective date',
  },
  hi: {
    heroTag: 'अस्वीकरण',
    title: 'Lokswami.com के लिए अस्वीकरण',
    subtitle:
      'यह अस्वीकरण Lokswami.com पर प्रकाशित जानकारी की सीमा, जिम्मेदारी और कानूनी स्थिति को स्पष्ट करता है।',
    legalNote:
      'Lokswami.com पर दी गई जानकारी केवल सामान्य सूचना उद्देश्यों के लिए है और इसे कानूनी, वित्तीय या पेशेवर सलाह नहीं माना जाना चाहिए।',
    highlightsTitle: 'मुख्य अस्वीकरण क्षेत्र',
    highlights: [
      { label: 'सामान्य उपयोग', icon: FileWarning },
      { label: 'सामग्री की सटीकता', icon: ShieldCheck },
      { label: 'बाहरी लिंक', icon: Globe2 },
      { label: 'दायित्व सीमा', icon: Scale },
    ] satisfies LegalPageHighlight[],
    sections: [
      {
        title: '1. सामान्य अस्वीकरण',
        icon: FileWarning,
        body: [
          'Lokswami.com पर उपलब्ध जानकारी केवल सामान्य सूचना उद्देश्यों के लिए प्रदान की जाती है।',
          'वेबसाइट पर प्रकाशित सामग्री को कानूनी, वित्तीय या किसी अन्य पेशेवर सलाह के रूप में नहीं माना जाना चाहिए।',
        ],
      },
      {
        title: '2. सामग्री की सटीकता',
        icon: ShieldCheck,
        body: [
          'सभी सामग्री सद्भावना में और उस समय विश्वसनीय माने गए स्रोतों के आधार पर प्रकाशित की जाती है।',
          'Lokswami वेबसाइट पर उपलब्ध जानकारी की पूर्णता, सटीकता या समयबद्धता की गारंटी नहीं देता।',
        ],
      },
      {
        title: '3. थर्ड-पार्टी लिंक',
        icon: Globe2,
        body: [
          'Lokswami.com में बाहरी वेबसाइटों या सेवाओं के लिंक हो सकते हैं। ऐसी वेबसाइटों की सामग्री, उपलब्धता या कार्यप्रणाली के लिए Lokswami जिम्मेदार नहीं है।',
        ],
      },
      {
        title: '4. दायित्व की सीमा',
        icon: Scale,
        body: [
          'कानून द्वारा अनुमत अधिकतम सीमा तक, वेबसाइट के उपयोग से होने वाले किसी भी प्रत्यक्ष या अप्रत्यक्ष नुकसान के लिए Lokswami, उसके स्वामी, संपादकीय टीम, कर्मचारी या सहयोगी उत्तरदायी नहीं होंगे।',
        ],
      },
      {
        title: '5. प्रतिपूर्ति',
        icon: AlertTriangle,
        body: [
          'उपयोगकर्ता सहमत हैं कि वेबसाइट के दुरुपयोग या लागू कानूनों के उल्लंघन से उत्पन्न किसी भी दावे, नुकसान या दायित्व के विरुद्ध वे Lokswami और उसके प्रतिनिधियों को सुरक्षित रखेंगे।',
        ],
      },
      {
        title: '6. लागू कानून और अधिकार क्षेत्र',
        icon: TriangleAlert,
        body: [
          'यह अस्वीकरण भारत के कानूनों द्वारा नियंत्रित होगा।',
          'किसी भी विवाद के लिए अधिकार क्षेत्र केवल इंदौर, मध्य प्रदेश की अदालतों का होगा।',
        ],
      },
    ] satisfies LegalPageSection[],
    contactTitle: 'संपर्क करें',
    contactText:
      'यदि आपको इस अस्वीकरण या वेबसाइट पर प्रकाशित जानकारी के संबंध में कोई प्रश्न हो, तो नीचे दिए गए विवरणों के माध्यम से हमसे संपर्क करें।',
    contactRoleLabel: 'संपादकीय और कानूनी संपर्क',
    contactRoleValue: 'Lokswami Newspaper',
    emailLabel: 'ईमेल',
    addressLabel: 'पता',
    lastUpdatedLabel: 'प्रभावी तिथि',
  },
} as const;

export default function DisclaimerPage() {
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
