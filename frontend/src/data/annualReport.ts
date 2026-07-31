export interface IcMember {
  sno: number
  name: string
  designation: string
  contact: string
}

export interface ExternalMemberDetail {
  sno: number
  name: string
  organization: string
  experienceYears: number
  contact: string
}

export interface AnnualReportData {
  year: string
  functionalIc: boolean
  functionalIcNote: string
  icMembers: IcMember[]
  externalMembers: ExternalMemberDetail[]
  displayLocations: string
  awarenessWorkshops: {
    count: number
    mode: string
    audience: string
    url: string
    notes: string
  }
  sensitizationWorkshops: {
    count: number
    notes: string
  }
  challenges: string
  feedback: string
  resourcePerson: {
    name: string
    credentials: string
  }
  preventiveMeasures: string
  employees: {
    total: number
    male: number
    female: number
    others: number
  }
  reportedCases: number
  confidentialityMeasures: string
  inquiryStatus: string
  pendingCases: string
  upcomingInitiatives: string
  otherInfo: string
  createdBy: string
}

/** Sample filled Annual Report — PoSH Act 2013 workplace submission format */
export const ANNUAL_REPORT: AnnualReportData = {
  year: '2025–26',
  functionalIc: true,
  functionalIcNote: 'Yes, we have a functional IC Committee.',
  icMembers: [
    { sno: 1, name: 'Ms. Shuchita Singh', designation: 'Presiding Officer', contact: '+91 7905580411' },
    { sno: 2, name: 'Ms. Parveen Akhter', designation: 'Internal Member', contact: '+91 9336666333' },
    { sno: 3, name: 'Ms. Shweta Singh', designation: 'Internal Member', contact: '+91 8960323144' },
    { sno: 4, name: 'Ms. Sneha Kala', designation: 'External Member', contact: '+91 9167204851' },
  ],
  externalMembers: [
    {
      sno: 1,
      name: 'Ms. Sneha Kala',
      organization: '—',
      experienceYears: 7,
      contact: '+91 9167204851',
    },
  ],
  displayLocations: "It's on the notice board at our office premise.",
  awarenessWorkshops: {
    count: 2,
    mode: 'Virtual',
    audience: 'Members, interns and volunteers',
    url: 'https://meet.google.com/waq-jdek-pgh',
    notes: 'We had two virtual sessions for the members, interns and volunteers.',
  },
  sensitizationWorkshops: {
    count: 0,
    notes: 'None',
  },
  challenges: 'No challenges.',
  feedback: 'No',
  resourcePerson: {
    name: 'Ms. Manjary Upadhyay',
    credentials:
      'Certified PoSH Master Trainer — V-Legal, Ministry of Women and Child Welfare, Ministry of Skill Development, Ministry of Basic Education, President — Jijiwisha Society.',
  },
  preventiveMeasures: 'Posters mentioning Zero Tolerance against sexual harassment.',
  employees: {
    total: 2,
    male: 1,
    female: 1,
    others: 0,
  },
  reportedCases: 0,
  confidentialityMeasures: 'N/A',
  inquiryStatus: 'N/A',
  pendingCases: 'N/A',
  upcomingInitiatives:
    'To make all the employees aware of this law by conducting more trainings and sensitization workshops.',
  otherInfo:
    'We have been providing trainers and panellists to the various organizations with a purpose of spreading awareness.',
  createdBy: 'Jijiwisha Society — an initiative to create safe workplaces that results in better yield and higher productivity',
}
