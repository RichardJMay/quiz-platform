// Existing packs only. Codes reflect the terms assigned to each pack in Bl-quizzes.xlsx.
// Keep the order explicit: adding a quiz in Supabase does not change this pathway.
type PackGuide = { title: string; theme: string; codes: string }

const packs: PackGuide[] = [
  { title: 'Philosophy A1/A2', theme: 'Scientific aims, measurement, variables and functional relations.', codes: 'A.1, A.2' },
  { title: 'Philosophy A2/A3', theme: 'Philosophical assumptions, radical behaviorism and explanations of behavior.', codes: 'A.2, A.3' },
  { title: 'Philosophy A4/A5', theme: 'Branches and defining features of applied behavior analysis.', codes: 'A.4, A.5, B.1, B.3' },

  { title: 'Principles: Contingencies 1', theme: 'Behavior, antecedents, consequences and the basic contingency.', codes: 'A.2, A.4, B.1, B.2, B.4, B.7, B.12, B.18' },
  { title: 'Principles: Contingencies 2', theme: 'Operant behavior, three-term contingencies and selection by consequences.', codes: 'A.2, A.3, B.1, B.2, B.3, B.16' },
  { title: 'Principles: Reinforcement', theme: 'Positive and negative reinforcement, conditioned reinforcers and extinction.', codes: 'B.4, B.6, B.7, B.11' },
  { title: 'Principles: Punishment', theme: 'Positive and negative punishment, punishers and response cost.', codes: 'B.5, B.6, B.8' },
  { title: 'Principles: Schedules of Reinforcement 1', theme: 'Continuous, intermittent, fixed and compound schedules.', codes: 'B.9, B.10' },
  { title: 'Principles: Schedules of Reinforcement 2', theme: 'Variable and compound schedules, thinning and schedule effects.', codes: 'B.9, B.10' },
  { title: 'Principles: Motivating Operations', theme: 'Establishing and abolishing operations and conditioned motivating operations.', codes: 'B.16' },
  { title: 'Principles: Respondent Conditioning', theme: 'Reflexes, conditioned stimuli, respondent extinction and related effects.', codes: 'B.3, B.11' },
  { title: 'Principles: Stimulus Control', theme: 'Discrimination, generalization, stimulus classes and conditional relations.', codes: 'B.1, B.2, B.12, B.13, B.14, B.24, G.11' },
  { title: 'Principles: Verbal Behavior', theme: 'Verbal operants, autoclitics, multiple control, listener behavior and rules.', codes: 'A.3, B.18, B.19, B.20' },
  { title: 'Principles: Derived Stimulus Relations', theme: 'Equivalence, derived relations and relational responding.', codes: 'B.21' },

  { title: 'Measurement C1-C4', theme: 'Operational definitions and direct measures of behavior.', codes: 'B.1, C.1, C.2, C.3, C.4, C.7, C.10' },
  { title: 'Measurement C5-C8', theme: 'Sampling, measurement quality and interobserver agreement.', codes: 'C.5, C.6, C.8' },
  { title: 'Measurement C10-C12', theme: 'Graphing, visual analysis and treatment fidelity.', codes: 'C.10, C.11, C.12' },

  { title: 'Experimental Design D1-D3', theme: 'Variables, validity, confounds and experimental control.', codes: 'D.1, D.2, D.3, D.4' },
  { title: 'Experimental Design D4-D5', theme: 'Baseline logic, repeated measurement and group designs.', codes: 'D.4, D.5' },
  { title: 'Experimental Design D5-D9', theme: 'Single-case designs, comparisons and visual analysis.', codes: 'D.4, D.5, D.6, D.7, D.8' },

  { title: 'Assessment F2-F4', theme: 'Assessment approaches, preference assessment and reinforcer assessment.', codes: 'F.3, F.4, H.2' },
  { title: 'Assessment F5-F6', theme: 'Functional behavior assessment, descriptive assessment and functional analysis.', codes: 'F.5, F.6' },
  { title: 'Assessment F7-F8', theme: 'Interpreting assessment results and selecting socially significant goals.', codes: 'E.3, F.6, F.8' },

  { title: 'Behavior Change G1-G3', theme: 'Reinforcement procedures and differential reinforcement.', codes: 'G.1, G.2, G.3' },
  { title: 'Behavior Change G4-G6', theme: 'Token systems, motivating operations and discrimination training.', codes: 'G.4, G.5, G.6' },
  { title: 'Behavior Change G7-G11', theme: 'Prompts, fading, modeling, shaping and rules.', codes: 'G.7, G.8, G.9, G.10, G.11' },
  { title: 'Behavior Change G12-G15', theme: 'Chaining, group contingencies and programming generalization.', codes: 'G.12, G.13, G.14, G.15' },
  { title: 'Behavior Change G16-G19', theme: 'Punishment procedures, maintenance, schedule thinning and equivalence.', codes: 'G.16, G.17, G.18, G.19' },

  { title: 'Interventions H1-H2', theme: 'Evidence-based practice, assessment and intervention goals.', codes: 'H.1, H.2' },
  { title: 'Interventions H2-H3', theme: 'Research evidence, replacement behavior and social validity.', codes: 'H.2, H.3' },
  { title: 'Interventions H4-H6', theme: 'Treatment integrity, drift, relapse and unwanted effects.', codes: 'H.4, H.5, H.6' },
  { title: 'Interventions H6', theme: 'Procedural integrity, engagement and performance feedback.', codes: 'H.6' },
  { title: 'Interventions H7-H8', theme: 'Intervention evaluation and caregiver training.', codes: 'H.7, H.8' },
]

const normalize = (title: string) => title.trim().toLocaleLowerCase('en')
const byTitle = new Map(packs.map((pack, index) => [normalize(pack.title), { ...pack, index }]))

export function getPackGuide(title: string) {
  return byTitle.get(normalize(title))
}

// Supabase returns unknown/new packs in created_at order; they follow the authored packs.
export function pathwayOrder(a: { title: string }, b: { title: string }) {
  return (getPackGuide(a.title)?.index ?? Infinity) - (getPackGuide(b.title)?.index ?? Infinity)
}
