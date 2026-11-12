// Starter content so a fresh install has something on the dashboard.
// In production these come from Claude's scheduled research runs via MCP.
export const SAMPLE_UPDATES = [
  {
    title: "BNS s.318 replaces IPC s.420: cheating",
    practice_area: "Criminal",
    jurisdiction: "All India",
    update_type: "New statute",
    effective_date: "2024-07-01",
    summary:
      "The Bharatiya Nyaya Sanhita, 2023 replaced the Indian Penal Code from 1 July 2024. Cheating is now defined in BNS s.318(1), and cheating that induces delivery of property (old IPC s.420) is punishable under BNS s.318(4).",
    before_text: "IPC s.415 defined cheating; s.420 punished cheating and dishonestly inducing delivery of property with up to 7 years and fine.",
    after_text: "BNS s.318 consolidates the definition and punishments; s.318(4) carries up to 7 years and fine.",
    repercussions: [
      "Offences committed on or after 1 July 2024 must be charged under BNS s.318; earlier offences remain under the IPC.",
      "Check FIRs and charge sheets for mixed or wrong-code citations, which can be raised at framing of charge.",
      "Precedent on IPC s.415/420 continues to guide interpretation because the ingredients are carried over.",
    ],
    related_cases: [
      {
        name: "Hridaya Ranjan Prasad Verma v. State of Bihar",
        citation: "(2000) 4 SCC 168",
        relevance: "Dishonest intention must exist at the inception of the transaction for cheating.",
      },
    ],
    sections: ["IPC 420", "IPC 415", "BNS 318", "BNS 318(4)"],
    sources: [{ title: "India Code: Bharatiya Nyaya Sanhita, 2023", url: "https://www.indiacode.nic.in" }],
  },
  {
    title: "BNSS s.482 replaces CrPC s.438: anticipatory bail",
    practice_area: "Criminal",
    jurisdiction: "All India",
    update_type: "New statute",
    effective_date: "2024-07-01",
    summary:
      "The Bharatiya Nagarik Suraksha Sanhita, 2023 replaced the CrPC from 1 July 2024. Anticipatory bail is now governed by BNSS s.482.",
    before_text: "CrPC s.438 empowered the High Court and Court of Session to grant pre-arrest bail.",
    after_text: "BNSS s.482 continues the power; BNSS s.531 saves proceedings pending under the CrPC on commencement.",
    repercussions: [
      "Applications in FIRs registered on or after 1 July 2024 should be filed under BNSS s.482.",
      "Proceedings pending before 1 July 2024 continue under the CrPC by virtue of the BNSS savings clause.",
      "Compare the text of s.482 against s.438 before relying on older drafting templates.",
    ],
    related_cases: [
      {
        name: "Gurbaksh Singh Sibbia v. State of Punjab",
        citation: "(1980) 2 SCC 565",
        relevance: "Foundational principles on the scope of anticipatory bail.",
      },
      {
        name: "Sushila Aggarwal v. State (NCT of Delhi)",
        citation: "(2020) 5 SCC 1",
        relevance: "Anticipatory bail need not be limited to a fixed period.",
      },
    ],
    sections: ["CRPC 438", "BNSS 482", "BNSS 531"],
    sources: [{ title: "Ministry of Home Affairs: New criminal laws", url: "https://www.mha.gov.in" }],
  },
  {
    title: "BSA s.63 replaces Evidence Act s.65B: electronic records",
    practice_area: "Criminal",
    jurisdiction: "All India",
    update_type: "New statute",
    effective_date: "2024-07-01",
    summary:
      "The Bharatiya Sakshya Adhiniyam, 2023 replaced the Indian Evidence Act from 1 July 2024. Admissibility of electronic records is now under BSA s.63, which requires a certificate in the format set out in the Schedule.",
    before_text: "IEA s.65B(4) required a certificate from a person occupying a responsible official position for the device.",
    after_text: "BSA s.63(4) requires a certificate in the prescribed Schedule format, signed by the person in charge of the device and an expert.",
    repercussions: [
      "Use the Schedule certificate format for electronic evidence filed after 1 July 2024, in criminal and civil matters.",
      "Arrange expert sign-off early; a defective certificate can make the record inadmissible.",
    ],
    related_cases: [
      {
        name: "Arjun Panditrao Khotkar v. Kailash Kushanrao Gorantyal",
        citation: "(2020) 7 SCC 1",
        relevance: "Certificate under s.65B(4) held mandatory for secondary electronic evidence.",
      },
      { name: "Anvar P.V. v. P.K. Basheer", citation: "(2014) 10 SCC 473", relevance: "Earlier holding on the s.65B certificate requirement." },
    ],
    sections: ["IEA 65B", "BSA 63"],
    sources: [{ title: "India Code: Bharatiya Sakshya Adhiniyam, 2023", url: "https://www.indiacode.nic.in" }],
  },
  {
    title: "Supreme Court: courts may modify arbitral awards in limited cases",
    practice_area: "Arbitration",
    jurisdiction: "All India",
    update_type: "Supreme Court judgment",
    effective_date: "2025-04-30",
    summary:
      "A Constitution Bench in Gayatri Balasamy v. ISG Novasoft held that courts hearing challenges under ss.34 and 37 of the Arbitration and Conciliation Act have a limited power to modify awards, rather than only set them aside.",
    before_text: "Conflicting benches; a line of authority held courts could only set aside, not modify, an award under s.34.",
    after_text: "Limited modification allowed, e.g. severing an invalid part, correcting clerical or computational errors, and in some cases post-award interest.",
    repercussions: [
      "Consider pleading modification in the alternative in s.34 petitions instead of seeking only a set-aside.",
      "Award-holders should assess whether a partial set-aside risk can be contained by severability arguments.",
    ],
    related_cases: [
      { name: "Gayatri Balasamy v. ISG Novasoft Technologies Ltd.", citation: "", relevance: "The Constitution Bench decision itself." },
      { name: "NHAI v. M. Hakeem", citation: "(2021) 9 SCC 1", relevance: "Earlier view that s.34 does not permit modification." },
    ],
    sections: ["ARBITRATION ACT 34", "ARBITRATION ACT 37"],
    sources: [{ title: "Supreme Court of India", url: "https://www.sci.gov.in" }],
  },
];
