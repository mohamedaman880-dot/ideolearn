import { PrismaClient, PublishStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Idempotent default SiteSettings row
  await prisma.siteSettings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      whatsappNumber: "+250780000000",
      phoneNumber: "+250780000000",
      email: "info@ideolearn.rw",
      addressEn: "Kigali, Rwanda",
      addressAr: "كيغالي، رواندا",
      socialLinks: {
        instagram: "",
        x: "",
        facebook: "",
        tiktok: "",
      },
      accuracyNoticeEn:
        "Tuition fees, admission criteria, and application dates are provided for informational guidance and remain subject to change by each university. Please confirm directly with the institution or via IdeoLearn before applying.",
      accuracyNoticeAr:
        "الرسوم الدراسية وشروط القبول ومواعيد التقديم معروضة للإرشاد المعلوماتي وتخضع للتحديث من قبل كل جامعة. يرجى التأكد مباشرة مع الجامعة أو عبر IdeoLearn قبل التقديم.",
      legalNoticeEn:
        "IdeoLearn is an independent educational consultancy and does not accept online payments or direct document submissions through this website.",
      legalNoticeAr:
        "IdeoLearn وكالة استشارات تعليمية مستقلة ولا تستقبل أي مدفوعات إلكترونية أو مستندات رسمية عبر هذا الموقع.",
      faqsEnabled: true,
      articlesEnabled: true,
    },
  });

  // 2. Idempotent default PageSection placeholders (created as DRAFT until admin publishes)
  const defaultSections = [
    {
      pageKey: "home",
      sectionKey: "hero",
      titleEn: "Your Trusted Guide to Bachelor's Study in Rwanda",
      titleAr: "دليلك الموثوق لدراسة البكالوريوس في رواندا",
      subtitleEn:
        "Explore accredited Rwandan universities, compare degree programs, and connect directly with our advisors on WhatsApp.",
      subtitleAr:
        "استكشف الجامعات المعتمدة في رواندا، وقارن البرامج الدراسية، وتواصل مباشرة مع مستشارينا عبر واتساب.",
      displayOrder: 1,
      status: PublishStatus.PUBLISHED,
    },
    {
      pageKey: "home",
      sectionKey: "how_it_works",
      titleEn: "How IdeoLearn Works",
      titleAr: "كيف تعمل منصة IdeoLearn",
      subtitleEn: "Three simple steps from program discovery to university admission guidance.",
      subtitleAr: "ثلاث خطوات بسيطة من استكشاف التخصص إلى إرشاد القبول الجامعي.",
      displayOrder: 2,
      status: PublishStatus.DRAFT,
    },
    {
      pageKey: "about",
      sectionKey: "mission",
      titleEn: "About IdeoLearn Educational Services",
      titleAr: "عن ايديو ليرن للخدمات الطلابية",
      bodyEn:
        "IdeoLearn empowers prospective students with transparent, accurate information about universities and bachelor's programs in Rwanda.",
      bodyAr:
        "تُمكّن ايديو ليرن الطلاب المقبلين على الدراسة الجامعية من الوصول إلى معلومات واضحة ودقيقة حول الجامعات وبرامج البكالوريوس في رواندا.",
      displayOrder: 1,
      status: PublishStatus.PUBLISHED,
    },
  ];

  for (const section of defaultSections) {
    await prisma.pageSection.upsert({
      where: {
        pageKey_sectionKey: {
          pageKey: section.pageKey,
          sectionKey: section.sectionKey,
        },
      },
      update: {},
      create: section,
    });
  }

  console.log("Database seed completed successfully (site_settings & page_sections).");
}

main()
  .catch((err) => {
    console.error("Database seed failed:", err);
    throw err;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });