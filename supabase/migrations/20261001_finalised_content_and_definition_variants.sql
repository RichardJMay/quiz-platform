-- Apply after the existing adaptive and Concepts rollout migrations.
-- Authoritative content: rephrased_versions.xlsx, Items sheet, 446 rows.
-- One transaction: validates pack/term identity before changing content.
begin;
alter table public.quiz_term_bank add column if not exists is_active boolean not null default true;
alter table public.questions add column if not exists prompt_kind text not null default 'definition',
  add column if not exists definition_variant smallint not null default 0,
  add column if not exists rephrased_definition text,
  add column if not exists context_question text;
create table if not exists public.content_revision_backup (
 revision text not null, entity text not null, record_id uuid not null, previous_row jsonb not null,
 primary key (revision, entity, record_id)
);
alter table public.content_revision_backup enable row level security;
revoke all on public.content_revision_backup from anon, authenticated;
create temporary table finalised_content (
 category text, pack text, term text, original_definition text, rephrased_definition text, context_question text,
 primary key(pack,term)
) on commit drop;
insert into finalised_content values
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Replication', 'Repetition of experimental conditions to verify reliability of findings', 'Repeating experimental conditions to confirm that a finding is reliable', 'After posted feedback increases hand-washing on one hospital ward, a team applies the same procedure on two more wards and sees the same increase. Which term describes repeating the conditions to check the finding?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Correlation', 'Relationship between variables without demonstrated causation/functional relation', 'A relation in which variables change together without a demonstrated causal (functional) relation', 'Across a summer, a town''s ice-cream sales and swimming-pool attendance rise and fall together. Nothing has been manipulated. Which term describes this relation?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Determinism', 'Assumption that behavior is lawful', 'The assumption that behavior is lawful', 'Before designing a program to increase recycling in an office, a consultant works from the assumption that recycling occurs in orderly relation to identifiable events. Which assumption is this?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Functional Relation', 'Reliable change in a dependent variable produced by systematic manipulation of an independent variable, where the change is unlikely to be due to extraneous factors', 'A dependable change in a dependent variable brought about by systematic manipulation of an independent variable, and unlikely to be explained by extraneous factors', 'In a reversal design, a café introduces, removes and reintroduces a prompt card at the till. Sales of reusable cups rise only when the card is present, every time. Which term describes the relation shown between the card and reusable-cup sales?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Independent Variable', 'Variable manipulated by the experimenter', 'The variable the experimenter manipulates', 'A researcher alternates two lengths of rest break across weeks to see their effect on packing accuracy in a warehouse. Which term describes the length of the rest break?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Dependent Variable', 'Behavior measured to assess change', 'The behavior measured to evaluate change', 'A researcher alternates two lengths of rest break across weeks to see their effect on packing accuracy in a warehouse. Which term describes packing accuracy?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Experimentation', 'Systematic manipulation of variables to identify functional relations', 'Systematically manipulating variables in order to identify functional relations', 'To find out what affects how quickly library books are returned, a librarian sends reminder texts in some weeks and not others while recording return times. Which term describes this approach?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Description', 'Systematic observation and quantification of behavior and events without manipulation', 'Systematic observation and quantification of behavior and events, with nothing manipulated', 'As a first step in studying a supermarket, researchers record how often shoppers pick up products from each shelf height over a month, without changing anything in the store. Which level of scientific understanding does this represent?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Prediction', 'Observed covariation between two events allowing probabilistic forecasting', 'Observed covariation between two events that allows probabilistic forecasting', 'Records show a commuter train is late on most rainy days, so passengers set off earlier when it rains. Which level of scientific understanding makes this forecast possible?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Measurement', 'Systematic quantification of behavior', 'Systematic quantification of behavior', 'A running coach records each athlete''s 400 m time with a stopwatch at every session. Which term describes assigning these numbers to behavior?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Empiricism', 'Reliance on objective observation and measurement as the basis of knowledge', 'Basing knowledge on objective observation and measurement', 'A head teacher will not adopt a popular reading scheme until classroom data show that it improves pupils'' reading. Which assumption of science is she acting on?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A1/A2', 'Control', 'Demonstration that manipulation of one variable reliably changes another (functional relation)', 'Showing that systematically changing one variable reliably produces change in another', 'Across repeated phases, a gym switches text reminders on and off, and attendance rises and falls each time. Which level of scientific understanding does this demonstrate?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Hypothetical Construct', 'Inferred internal entity or process invoked to explain behavior, neither directly observed nor experimentally manipulated', 'An inferred internal entity or process offered to explain behavior, which is neither directly observed nor experimentally manipulated', 'A manager explains an employee''s high sales by saying she has ''a strong work ethic'', although no such thing can be observed or manipulated. Which term describes ''work ethic'' as used here?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Philosophic Doubt', 'Continuous questioning of truthfulness of knowledge and openness to revision', 'Ongoing questioning of the truth of what is known, with openness to revising it', 'Although her team''s intervention has worked for years, a behavior analyst regularly checks new studies and her own data for evidence that it should change. Which attitude of science does this reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Explanatory Fiction', 'Circular explanation that restates behavior without identifying controlling variables', 'A circular account that restates the behavior instead of identifying its controlling variables', 'Asked why a colleague cycles to work every day, someone answers, ''Because he''s a keen cyclist'', and gives the daily cycling as the only evidence that he is keen. Which term describes this explanation?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Private Events', 'Behavior occurring within the skin, accessible only to the individual', 'Behavior that occurs within the skin and is accessible only to the person', 'Before a job interview, a candidate silently rehearses answers and feels their heart racing. Which term describes these events, observable only to the candidate?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Radical Behaviorism', 'Philosophy that includes private events as behavior subject to the same principles as public events', 'A philosophy that treats private events as behavior governed by the same principles as public behavior', 'A behavior analyst accounts for a client''s critical self-talk using the same environmental variables used to explain the client''s spoken behavior. Which philosophy does this reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Pragmatism', 'The view that the value or truth of an idea is judged by how effectively it works in practice', 'The view that the truth or value of an idea is judged by how well it works in practice', 'A transport department keeps a behavioral account of speeding because interventions based on it reliably reduce speeds. Which assumption judges the account in this way?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Mentalism', 'Explaining behavior by reference to hypothetical inner causes or constructs', 'Explaining behavior by reference to hypothetical inner causes', 'A commentator says a footballer missed a penalty ''because his confidence was low'', without examining the conditions of the kick. Which approach does this explanation reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Methodological Behaviorism', 'Position that acknowledges private events but excludes them from scientific analysis on the grounds of inaccessibility', 'A position that acknowledges private events but excludes them from scientific analysis because others cannot observe them', 'A researcher accepts that participants have thoughts, but studies only what they say and do, on the grounds that thoughts can''t be observed by others. Which position is this?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Objective', 'Independent of observer bias or subjective interpretation', 'Free from observer bias or subjective interpretation', 'Two observers using the same written definition independently record the same number of drivers fastening seatbelts at a car-park exit. Which quality of observation does their agreement reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Parsimony', 'Preference for the simplest explanation that adequately accounts for the data, ruling out simpler alternatives before invoking more complex ones', 'Preferring the simplest explanation that accounts for the data, ruling out simpler explanations before more complex ones', 'Before concluding that a pupil''s copying errors reflect a learning difficulty, a teacher first checks whether the pupil can see the board from their seat. Which principle is she following?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Environmental Variables', 'External events that influence behavior', 'Events outside the person that influence behavior', 'In a call centre, background noise, the number of calls waiting and the presence of a supervisor all affect how quickly calls are answered. Which term covers these influences?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A2/A3', 'Selectionism', 'Behavior is shaped and maintained by its consequences over time', 'The view that behavior is shaped and maintained by its consequences over time', 'Over several weeks, the delivery routes that get a rider''s orders delivered fastest are used more and more, and slower routes drop out. Which assumption accounts for behavior in this way?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Applied Behavior Analysis', 'Application of behavioral principles to socially significant behavior using experimental methods', 'The application of behavioral principles to socially significant behavior, using experimental methods', 'A research team uses a multiple-baseline design to show that a feedback program increases safe lifting among warehouse staff. Which domain of behavior analysis does this work belong to?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Effective', 'Dimension: Behavior change is socially meaningful in magnitude', 'Dimension: the behavior change is large enough to be socially meaningful', 'A smoking-reduction program reliably reduces a participant''s cigarettes from 20 to 18 a day, a change too small to make a difference to their health. Which dimension of ABA does the program fail to meet?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Applied', 'Dimension: Focus on behavior of social importance to the participant or those around them', 'Dimension: targets behavior that is socially important to the person or those around them', 'A behavior analyst chooses to teach a young adult to use a cash machine rather than to sort coloured pegs, because using a cash machine matters in daily life. Which dimension of ABA guides this choice?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Behaviorism', 'Philosophy of the science of behavior', 'The philosophy of the science of behavior', 'A university module examines the assumptions underlying behavior science, such as explaining behavior by its relation to the environment. Which domain of behavior analysis is the module about?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Translational Research', 'Research that bridges the experimental analysis of behavior and applied behavior analysis', 'Research linking the experimental analysis of behavior with applied behavior analysis', 'Researchers test whether laboratory findings on reinforcer delay predict how pupils choose between an immediate small reward and a later larger one in class. Which domain does this bridging work belong to?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Technological', 'Dimension: Procedures described clearly enough for replication', 'Dimension: procedures are described in enough detail to be replicated', 'A published coaching protocol specifies the exact wording of each prompt, when it is given and the consequence for each response, so other coaches can carry it out identically. Which dimension of ABA does this reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Consequence', 'Stimulus change following behavior that affects future responding', 'A stimulus change following behavior that affects future responding', 'A driver pays at a toll booth and the barrier lifts. Which term describes the barrier lifting, in relation to paying?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Social Significance', 'Importance of behavior to individuals or society', 'The importance of a behavior to the individual or society', 'A team prioritizes teaching an older adult to use a video-calling app because it lets her keep in regular contact with her family. Which term describes the importance of this target to her?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Conceptually Systematic', 'Dimension: Procedures derived from and linked to behavioral principles', 'Dimension: procedures are derived from and described in terms of behavioral principles', 'A report describes a café loyalty card as a token system using generalized conditioned reinforcement, rather than as a ''motivation booster''. Which dimension of ABA does this reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Experimental Analysis of Behavior', 'Basic science that identifies functional relations under controlled conditions', 'The basic science that identifies functional relations under controlled conditions', 'In a laboratory, researchers measure how pigeons'' key pecking changes as the number of pecks required for food increases. Which domain of behavior analysis is this?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Generality', 'Dimension: Behavior change persists across time, settings, or behaviors', 'Dimension: the behavior change lasts over time or spreads to other settings or behaviors', 'Months after a road-safety program ends, children still stop at the kerb before crossing, including on routes never used in training. Which dimension of ABA does this show?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Antecedent', 'Stimulus condition preceding behavior', 'A stimulus condition that comes before behavior', 'A phone notification sounds and its owner picks up the phone. Which term describes the notification?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Professional Practice', 'Delivery of behavior-analytic services using established principles', 'The delivery of behavior-analytic services based on established principles', 'A BCBA assesses a client, writes a treatment plan and supervises its delivery, without conducting research. Which domain of behavior analysis is this?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Analytic', 'Dimension: Demonstration of functional relations (experimental control)', 'Dimension: demonstrates a functional relation between the intervention and the behavior (experimental control)', 'A reversal design shows that a production team''s quality errors fall each time a checklist is introduced and rise each time it is withdrawn. Which dimension of ABA does this demonstrate?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Behavioral', 'Dimension: Direct measurement of observable behavior', 'Dimension: directly measures observable behavior', 'To evaluate a fitness program, a coach counts the push-ups each participant completes, rather than asking them to rate their ''commitment''. Which dimension of ABA does this reflect?'),
('A. Behaviorism and Philosophical Foundations', 'Philosophy A4/A5', 'Three-Term Contingency', 'Relation between antecedent, behavior, and consequence', 'The relation among antecedent, behavior and consequence', 'A traffic light turns green, a driver moves off, and the driver passes through the junction. Which term describes the relation among these three events?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Empiricism', 'Objective observation independent of individual prejudices', 'Objective observation that does not depend on personal bias', 'A head teacher will not adopt a popular reading scheme until classroom data show that it improves pupils'' reading. Which assumption of science is she acting on?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Determinism', 'Universe is lawful/orderly; phenomena occur in relation to other events', 'The assumption that the universe is orderly and that events occur in relation to other events', 'Before designing a program to increase recycling in an office, a consultant works from the assumption that recycling occurs in orderly relation to identifiable events. Which assumption is this?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Antecedent', 'Environmental condition/stimulus change existing/occurring prior to behavior of interest', 'An environmental condition or stimulus change present or occurring before the behavior of interest', 'A phone notification sounds and its owner picks up the phone. Which term describes the notification?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Consequence', 'Stimulus change following behavior; some significantly influence future behavior', 'A stimulus change following behavior, some of which strongly influence future behavior', 'A driver pays at a toll booth and the barrier lifts. Which term describes the barrier lifting, in relation to paying?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Behaviorism', 'Philosophy of behavior science; various forms exist', 'The philosophy of the science of behavior, which takes several forms', 'A university module examines the assumptions underlying behavior science, such as explaining behavior by its relation to the environment. Which domain of behavior analysis is the module about?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Applied Behavior Analysis', 'Science applying behavior principles to improve socially significant behavior using experimentation', 'The science that applies behavioral principles, using experimentation, to improve socially significant behavior', 'A research team uses a multiple-baseline design to show that a feedback program increases safe lifting among warehouse staff. Which domain of behavior analysis does this work belong to?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Clicker Training', 'Shaping using conditioned reinforcement via auditory stimulus', 'Shaping that uses an auditory stimulus as a conditioned reinforcer', 'A zoo keeper pairs a click with fish, then clicks each time a sea lion moves a little closer to presenting its flipper for a health check. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Environment', 'Real circumstances where organism exists; required for behavior', 'The actual circumstances in which an organism exists, without which behavior cannot occur', 'Which term refers to everything surrounding a swimmer during a race: the water, the lane ropes, the crowd noise and the starting signal?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Conditional Probability', 'Likelihood target behavior occurs in given circumstance (0.0-1.0)', 'The likelihood, from 0.0 to 1.0, that a target behavior occurs in a given circumstance', 'A coach records that a player shoots on 8 of every 10 occasions when she receives the ball inside the box. Which term describes the value 0.8?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Discriminated Operant', 'Operant occurring more frequently under some antecedent conditions', 'An operant that occurs more often under some antecedent conditions than under others', 'Drivers slow down more often on stretches of road where speed-camera signs are posted than where they are absent. Which term describes slowing down here?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Contingency-Shaped Behavior', 'Behavior acquired through direct contingency experience', 'Behavior acquired through direct contact with contingencies', 'A new barista learns how firmly to press coffee grounds by trying different pressures and tasting the results, without being told. Which term describes this behavior?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Differential Reinforcement', 'Reinforcing only responses meeting specific criterion while extinguishing others', 'Reinforcing only responses that meet a specified criterion while withholding reinforcement for others', 'A singing teacher praises notes sung in tune and gives no praise for notes that are off pitch. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Antecedent Stimulus Class', 'Set of stimuli evoking same operant or eliciting same respondent behavior', 'A set of stimuli that evoke the same operant or elicit the same respondent', 'At a car-park entrance, a ''No Entry'' sign, a closed barrier and a steward''s raised hand all evoke drivers stopping. Which term describes this set of stimuli?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Behavioral Cusp', 'Behavior with dramatic consequences exposing person to new contingencies', 'A behavior change with far-reaching consequences that exposes the person to new contingencies', 'After learning to drive, a young adult gains access to jobs, friends and leisure activities that were previously out of reach. Which term describes learning to drive in this case?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Contingency', 'Dependent/temporal relations between operant behavior and controlling variables', 'The dependent and temporal relations between operant behavior and its controlling variables', 'A parking app opens the barrier only after payment has been completed. Which term describes this dependency between paying and the barrier opening?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Contingent', 'Reinforcement/punishment delivered only after target behavior occurs', 'Describes reinforcement or punishment delivered only after the target behavior occurs', 'A gym gives a free smoothie only to members who complete a full workout. How is the smoothie described, with respect to completing the workout?'),
('B. Concepts and Principles', 'Principles: Contingencies 1', 'Behavior', 'Organism''s interaction with environment involving movement of some part', 'An organism''s interaction with its environment involving movement of some part of the organism', 'A cat pushes a door open with its head. Which term describes the cat''s action?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Parsimony', 'Ruling out simple explanations before considering complex ones', 'Excluding simple explanations before turning to more complex ones', 'Before concluding that a pupil''s copying errors reflect a learning difficulty, a teacher first checks whether the pupil can see the board from their seat. Which principle is she following?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Explanatory Fiction', 'Fictitious variable contributing nothing to functional understanding', 'An invented variable that adds nothing to a functional understanding of behavior', 'Asked why a colleague cycles to work every day, someone answers, ''Because he''s a keen cyclist'', and gives the daily cycling as the only evidence that he is keen. Which term describes this explanation?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Radical Behaviorism', 'Understanding all behavior including private events through controlling variables', 'Accounting for all behavior, including private events, in terms of its controlling variables', 'A behavior analyst accounts for a client''s critical self-talk using the same environmental variables used to explain the client''s spoken behavior. Which philosophy does this reflect?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Pragmatism', 'Truth value determined by promoting effective action', 'The view that an idea''s truth depends on whether it leads to effective action', 'A transport department keeps a behavioral account of speeding because interventions based on it reliably reduce speeds. Which assumption judges the account in this way?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Selectionism', 'The principle that life forms and repertoires evolve as a function of the their environments', 'The theory that forms of life, and behavior, are selected by their consequences', 'Over several weeks, the delivery routes that get a rider''s orders delivered fastest are used more and more, and slower routes drop out. Which assumption accounts for behavior in this way?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Methodological Behaviorism', 'Views non-public events as outside science realm', 'A position that places events that are not publicly observable outside the realm of science', 'A researcher accepts that participants have thoughts, but studies only what they say and do, on the grounds that thoughts can''t be observed by others. Which position is this?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Mentalism', 'Approach assuming inner dimension differs from behavioral dimension', 'An approach assuming that an inner dimension exists apart from the behavioral dimension and accounts for behavior', 'A commentator says a footballer missed a penalty ''because his confidence was low'', without examining the conditions of the kick. Which approach does this explanation reflect?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Philosophic Doubt', 'Continually questioning scientific theory truthfulness/validity', 'Continually questioning whether scientific theories are true or valid', 'Although her team''s intervention has worked for years, a behavior analyst regularly checks new studies and her own data for evidence that it should change. Which attitude of science does this reflect?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Three-Term Contingency', 'Basic operant unit: antecedent-behavior-consequence relations', 'The basic unit of operant analysis: the antecedent–behavior–consequence relation', 'A traffic light turns green, a driver moves off, and the driver passes through the junction. Which term describes the relation among these three events?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Phylogeny', 'Natural evolution history of species', 'The evolutionary history of a species', 'Newly hatched sea turtles move towards the brightest horizon, a response inherited through natural selection. Which term refers to the history that produced this response?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Ontogeny', 'History of individual organism development during lifetime', 'The developmental history of an individual organism over its lifetime', 'A chef''s knife skills developed through years of practice in different kitchens. Which term refers to this individual history?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Operant Conditioning', 'Basic process; consequences affect future behavior frequency', 'The basic process by which consequences change the future frequency of behavior', 'Each time a commuter takes a new shortcut she arrives earlier, and over a few weeks she takes the shortcut more and more often. Which process does this illustrate?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Topography', 'Physical form/shape of behavior', 'The physical form or shape of behavior', 'A golf coach records whether a player''s swing is flat or upright, regardless of where the ball lands. Which dimension of behavior is being recorded?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Stimulus', 'Energy change affecting organism through receptor cells', 'An energy change that affects an organism through its receptor cells', 'A phone vibrates against its owner''s leg. Which term describes the vibration?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Function-Based Definition', 'Responses defined by common environmental effect', 'Defining responses by their common effect on the environment', 'A hotel defines ''requesting service'' as any guest action that results in staff arriving at the room, whether phoning, pressing a call button or using an app. Which kind of definition is this?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Satiation', 'Decreased frequency from continued reinforcer contact', 'A decrease in responding resulting from continued contact with a reinforcer', 'After an hour of free online gaming, a teenager stops doing chores that earn extra game time. Which term describes the effect of this continued access?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Response', 'Single instance of specific behavior class', 'A single instance of a specific behavior class', 'Which term describes one tap of a travel card on a ticket barrier?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Functionally Equivalent', 'Different topographies producing same consequences', 'Describes different topographies that produce the same consequence', 'Waving, calling out and pressing a call bell all result in a nurse coming to a patient''s bedside. Which term describes these responses?'),
('B. Concepts and Principles', 'Principles: Contingencies 2', 'Operant Behavior', 'Behavior selected/maintained by consequences; learning history product', 'Behavior selected and maintained by its consequences; a product of learning history', 'An angler keeps returning to the same spot on a river because fishing there has often produced catches. Which kind of behavior is returning to that spot?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Stimulus Equivalence', 'Class of stimuli demonstrated by the emergence of reflexivity, symmetry, and transitivity.', 'A stimulus class shown by the emergence of reflexivity, symmetry and transitivity', 'After being taught to match a printed word to a picture and the picture to a sign, a learner matches the sign and the word in both directions without training. Which term describes the class formed?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Class Expansion', 'Adding new member to demonstrated stimulus equivalence class', 'Adding a new member to an established stimulus equivalence class', 'A learner with an equivalence class of the English word, picture and sign for ''cat'' is taught the French word ''chat'', which then joins the class. Which term describes this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Naming', 'Higher-order verbal cusp fusing speaker/listener repertoires bidirectionally', 'A higher-order verbal cusp in which speaker and listener repertoires are joined in both directions', 'After hearing ''kiwi'' while looking at the fruit, a child can both point to a kiwi when asked and say ''kiwi'' when shown one. Which term describes this repertoire?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Nonequivalence Relations', 'Derived relations based on something OTHER than sameness', 'Derived relations based on something other than sameness', 'Told that a 50p coin is worth more than a 10p coin, a child derives that the 10p coin is worth less. Which term describes relations of this kind?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Symmetry', 'Derivation of a B → A relation following A → B training', 'Deriving a B → A relation after training A → B', 'After learning to choose a picture of a bird given the word ''bird'', a learner chooses the word when shown the picture. Which property is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Transitivity', 'Derivation of a A → C relation following A → B and B → C training', 'Deriving an A → C relation after training A → B and B → C', 'After learning a word goes with a picture and the picture with a symbol, a learner chooses the symbol when given the word. Which property is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Contextual Control', 'Context determines stimulus function; requires five-term contingency', 'When the context determines a stimulus''s function, requiring a five-term contingency', 'In a matching task, a ''same'' cue makes the identical picture the correct choice, while an ''opposite'' cue makes the contrasting picture correct. Which term describes this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Arbitrary Relations', 'Stimulus relations based on social-verbal contingencies not physical similarity', 'Stimulus relations based on social-verbal contingencies rather than physical similarity', 'The written numeral ''3'' and the spoken word ''three'' are related only through social convention. Which term describes this kind of relation?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Arbitrarily Applicable Relational Responding', 'Derived relational responding determined by social convention', 'Responding to derived stimulus relations that are determined by social convention', 'A child responds to a small paper banknote as worth more than a large coin, on the basis of convention rather than size. Which term describes this responding?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Combined Symmetry and Transitivity', 'Derivation of a C→ A relation following A → B and B → C training', 'Deriving a C → A relation after training A → B and B → C', 'After learning word → picture and picture → sign, a learner chooses the word when given the sign. Which derived relation is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Nodal Stimulus', 'A stimulus common across minimum two conditional discriminations', 'A stimulus common to at least two conditional discriminations', 'A picture is matched to a word in one trained relation and to a sign in another. Which term describes the picture?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Reflexivity', 'Responding to a stimulus as equivalent to itself in the absence of explicit training', 'Responding to a stimulus as equivalent to itself without explicit training', 'Without being taught, a learner matches a photo of a key to an identical photo of the same key. Which property is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Mutual Entailment', 'Bidirectional stimulus relation; one direction learned other derived (RFT term)', 'A bidirectional relation in which one direction is learned and the other derived (RFT term)', 'Taught that ''Sam is taller than Jo'', a learner derives that ''Jo is shorter than Sam''. In RFT, which property is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Combinatorial Entailment', 'Relation involving two stimuli both in mutual entailment with third stimulus (RFT term)', 'A derived relation between two stimuli that are each in a relation of mutual entailment with a third (RFT term)', 'Taught that ''A is older than B'' and ''B is older than C'', a learner derives that ''A is older than C''. In RFT, which property is this?'),
('B. Concepts and Principles', 'Principles: Derived Stimulus Relations', 'Distinction Relation', 'Relation between two or more stimuli in terms of their difference from one another', 'A relation between stimuli in terms of their difference from one another', 'A learner is taught that ''a hammer is not a spanner'' and responds to the two tools accordingly. Which type of relation is this?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Establishing Operation (EO)', 'An MO that increases the effectiveness of a stimulus as a reinforcer (e.g., food deprivation).', 'A motivating operation that increases the effectiveness of a stimulus as a reinforcer', 'After a long run on a hot day, water is a more effective reinforcer for a runner than usual. Which term describes the long run in the heat?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Transitive CMO (CMO-T)', 'A stimulus that establishes the reinforcing effectiveness of another stimulus (e.g., presenting a juice box makes a straw valuable).', 'A stimulus that establishes the reinforcing effectiveness of another stimulus', 'An office worker finds a stapler empty, which makes staples an effective reinforcer and evokes asking for them. Which term describes the empty stapler?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Conditioned MO (CMO)', 'An MO whose value-altering effect depends on a learning history.', 'A motivating operation whose value-altering effect depends on a learning history', 'Seeing a pay-and-display parking machine makes coins effective as reinforcers for a driver, an effect that depends on past experience with such machines. Which term describes this kind of motivating operation?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Surrogate CMO (CMO-S)', 'A previously neutral stimulus that acquires MO effectiveness through pairing with a UMO or another CMO.', 'A previously neutral stimulus that acquires motivating effects by being paired with a UMO or another CMO', 'A cinema that has often been cold makes a jumper more effective as a reinforcer as soon as a viewer enters, even on a warm evening. Which term describes the cinema?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Motivating Operation (MO)', 'An environmental variable that alters the reinforcing effectiveness of a stimulus and the current frequency of all behavior reinforced by that stimulus.', 'An environmental variable that alters a stimulus''s reinforcing effectiveness and the current frequency of all behavior reinforced by that stimulus', 'Missing lunch makes food a more effective reinforcer and makes all behavior that has produced food more frequent. Which term describes missing lunch?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Evocative Effect', 'An increase in the current frequency of behavior that has been reinforced by the stimulus that is increased in value.', 'An increase in the current frequency of behavior that has been reinforced by the stimulus whose value has increased', 'After hours without a drink, a walker asks for water more often than usual. Which term describes this increase in asking?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Unconditioned MO (UMO)', 'An MO whose value-altering effect does not depend on a learning history (e.g., deprivation of oxygen, food, or sleep).', 'A motivating operation whose value-altering effect does not depend on a learning history', 'Being awake for 20 hours makes sleep more effective as a reinforcer, with no learning required. Which term describes the sleep deprivation?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Value-Altering Effect', 'An alteration in the reinforcing effectiveness of a stimulus, object, or event (either EO or AO).', 'A change in the reinforcing effectiveness of a stimulus, object or event', 'Eating salty snacks makes drinks more effective as reinforcers. Which term describes this change in the drinks'' effectiveness?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Behavior-Altering Effect', 'An alteration in the current frequency of behavior reinforced by the stimulus that was altered in effectiveness (either Evocative or Abative).', 'A change in the current frequency of behavior reinforced by the stimulus whose effectiveness was altered', 'Eating salty snacks makes going to the fridge for a drink more frequent. Which term describes this change in going to the fridge?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Abative Effect', 'A decrease in the current frequency of behavior that has been reinforced by the stimulus that is decreased in value.', 'A decrease in the current frequency of behavior that has been reinforced by the stimulus whose value has decreased', 'After a large meal, a diner orders dessert less than usual. Which term describes this decrease in ordering?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Reflexive CMO (CMO-R)', 'A previously neutral stimulus that acquires MO effectiveness by preceding a situation that is worsening or improving; often functions as a warning stimulus.', 'A previously neutral stimulus that acquires motivating effects by preceding a worsening or improving situation, often acting as a warning', 'A manager''s calendar invite titled ''Performance concerns'' makes cancelling the meeting more effective as a reinforcer, because similar invites have preceded difficult meetings. Which term describes the invite?'),
('B. Concepts and Principles', 'Principles: Motivating Operations', 'Abolishing Operation (AO)', 'An MO that decreases the effectiveness of a stimulus as a reinforcer (e.g., satiation).', 'A motivating operation that decreases the effectiveness of a stimulus as a reinforcer', 'After an all-you-can-eat buffet, food is a less effective reinforcer for a diner. Which term describes eating at the buffet?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Conditioned Punisher', 'Previously neutral stimulus functioning as punisher through pairing', 'A previously neutral stimulus that functions as a punisher through pairing', 'A referee''s yellow card reduces a player''s late tackles because it has been paired with suspensions. Which term describes the yellow card?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Bonus Response Cost', 'Person provided reinforcer removed in amounts contingent on behavior', 'Removing reinforcers that were provided to the person in advance, in amounts contingent on the behavior', 'At the start of each shift, staff receive 10 bonus points, and one point is removed for each safety rule broken. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Negative Punishment', 'Stimulus removal following response decreases future responses', 'Removing a stimulus after a response decreases the future frequency of that response', 'A streaming service suspends a user''s account for a week after sharing a password, and password sharing decreases. Which process is this?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Automatic Punishment', 'Punishment occurring independent of social mediation', 'Punishment that occurs without mediation by another person', 'A gardener grabs a rose stem and is pricked by its thorns, and afterwards grabs rose stems less often. Which term describes this punishment?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Punisher', 'The stimulus change that decreases future occurrence of preceding behavior', 'The stimulus change that decreases the future occurrence of the behavior it follows', 'A parking ticket follows parking on a double yellow line, and that driver parks there less often afterwards. Which term describes the parking ticket?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Punishment', 'Response-consequence relation weakening future operant response class', 'A response–consequence relation that weakens a future operant response class', 'Whenever a consequence following a behavior makes that behavior occur less often in future, which relation is operating?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Positive Punishment', 'Stimulus presentation following response decreases frequency', 'Presenting a stimulus after a response decreases its frequency', 'Touching an electric fence produces a jolt, and cattle touch the fence less often. Which process is this?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Recovery from Punishment', 'Previously punished response occurring without punishing consequence', 'A previously punished response occurring again when it no longer produces the punishing consequence', 'Drivers speed again on a road once its speed camera is removed. Which term describes this return of speeding?'),
('B. Concepts and Principles', 'Principles: Punishment', 'Unconditioned Punisher', 'Stimulus change that weakens behavior regardless of learning history', 'A stimulus change that weakens behavior regardless of learning history', 'A child touches a hot oven door, is burned, and touches the oven less often, without any prior pairing. Which term describes the burn?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Avoidance Contingency', 'Contingency where response prevents/postpones stimulus presentation', 'A contingency in which a response prevents or postpones the presentation of a stimulus', 'Paying a parking fine within 14 days stops a surcharge from ever being added, and drivers who have paid late before now pay promptly. Which contingency maintains prompt payment?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Generalized Conditioned Reinforcer', 'Conditioned reinforcer paired with many reinforcers; no specific EO needed', 'A conditioned reinforcer paired with many other reinforcers, so no specific establishing operation is needed for it to be effective', 'Airline miles can be exchanged for flights, hotel stays, meals or shopping, and they keep frequent flyers booking with the airline whatever else they currently lack. Which term describes the miles?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Discriminated Avoidance', 'Responding to signal prevents aversive stimulus onset', 'Responding to a signal in a way that prevents the onset of an aversive stimulus', 'When a dashboard light warns that the fuel is low, a driver refuels and so never runs out of fuel. Which term describes this arrangement?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Unconditioned Negative Reinforcer', 'Functions as negative reinforcer due to phylogeny', 'A stimulus that functions as a negative reinforcer because of the species'' evolutionary history', 'Hikers move into the shade more often because moving there removes intense midday heat, without any history of pairing. Which term describes the intense heat?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Resurgence', 'Reoccurrence of previously reinforced behavior when alternative reinforcement terminated', 'The recurrence of a previously reinforced behavior when reinforcement for an alternative behavior stops', 'An adult who learned to ask colleagues for help instead of leaving tasks unfinished starts leaving tasks unfinished again when colleagues stop responding to requests for help. Which term describes this return?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Automatic Reinforcement', 'Reinforcement occurring independent of social mediation by others', 'Reinforcement that occurs without mediation by another person', 'A person cracks their knuckles, and the sensation produced by cracking them maintains the behavior, whether or not anyone is present. Which term describes this reinforcement?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Negative Reinforcement', 'Stimulus termination/reduction/avoidance increases response occurrence', 'A response becomes more frequent because it ends, reduces or avoids a stimulus', 'Turning down the volume stops a loud advert, and a viewer turns down the volume more often during adverts. Which process is this?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Spontaneous Recovery', 'Behavior recurring during EXT (often when reintroduced to the same context)', 'The sudden reappearance of a behavior during extinction, often at the start of a later session', 'After a vending machine is switched off and customers stop pressing its buttons, several press the buttons again on the first morning after the weekend. Which term describes this reappearance?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Conditioned Negative Reinforcer', 'Previously neutral stimulus functioning as negative reinforcer as a result of pairing', 'A previously neutral stimulus that functions as a negative reinforcer as a result of pairing', 'An office worker switches off an email alert tone that has repeatedly come before stressful requests, and switching it off becomes more frequent. Which term describes the alert tone?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Extinction-Induced Variability', 'Changes in response topography during extinction', 'Changes in the form of responding during extinction', 'When a jammed car-park ticket machine stops issuing tickets, drivers press different buttons, press harder and try the card slot. Which term describes this change in responding?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Conditioned Reinforcer', 'Stimulus functioning as reinforcer due to prior pairing with other reinforcers', 'A stimulus that functions as a reinforcer because of prior pairing with other reinforcers', 'A trainer''s ''good'' strengthens a horse''s responding only after it has been repeatedly paired with treats. Which term describes ''good''?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Aversive Stimulus', 'Stimulus evoking escape/functioning as punisher when presented/reinforcer when withdrawn', 'A stimulus that evokes escape, functions as a punisher when presented, or functions as a reinforcer when withdrawn', 'A smoke alarm''s shrill tone leads people to switch it off quickly, reduces behavior that sets it off, and strengthens behavior that silences it. Which term describes the tone?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Positive Reinforcement', 'Stimulus presentation following response increases similar responses', 'Presenting a stimulus after a response increases similar responses', 'After an app shows a celebratory badge for each day of practice, users practise on more days. Which process is this?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Extinction Burst', 'Initial frequency increase when reinforcment witheld for previously reinforced response class', 'An initial increase in responding when reinforcement for a previously reinforced response is withheld', 'When a lift''s call button stops working, people press it repeatedly and more forcefully before giving up. Which term describes this increase?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Reinforcement', 'Response-consequence relation increasing behavior occurrence', 'A response–consequence relation that increases the occurrence of behavior', 'Whenever a consequence following a behavior makes that behavior occur more often in future, which relation is operating?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Unconditioned Reinforcer', 'Increases behavior regardless of learning history', 'A stimulus that increases behavior without any learning history', 'Warmth strengthens a cold walker''s behavior of stepping into a heated shop, without any prior pairing. Which term describes the warmth?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Extinction', 'Discontinuing reinforcement of previously reinforced behavior', 'Discontinuing reinforcement for a previously reinforced behavior', 'A parent stops buying sweets at the checkout when their child asks for them, after previously always doing so. Which procedure is the parent using?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Automaticity of Reinforcement', 'Behavior modified by consequences regardless of person''s awareness', 'Consequences change behavior regardless of whether the person is aware of them', 'A shopper returns more often to a market stall where the stallholder chats with them, without being able to say why they go there. Which term describes this effect?'),
('B. Concepts and Principles', 'Principles: Reinforcement', 'Escape Contingency', 'Response terminates ongoing stimulus', 'A contingency in which a response ends an ongoing stimulus', 'Closing a window ends the noise from road works outside, and closing windows becomes more likely during the works. Which contingency is operating?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Higher-Order Conditioning (secondary conditioning)', 'Conditioned reflex development by pairing NS with CS', 'Developing a conditioned reflex by pairing a neutral stimulus with a conditioned stimulus', 'A jingle already elicits excitement because it has been paired with prize draws. After a company logo is repeatedly shown with the jingle, the logo alone elicits excitement. Which term describes this process?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Reflex', 'Stimulus-response relation; antecedent stimulus and elicited respondent', 'A stimulus–response relation consisting of an antecedent stimulus and the respondent it elicits', 'Grit enters the eye and tears are produced. Which term describes the relation between the grit and the tears?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Habituation', 'Decreased responsiveness to repeated stimulus presentations', 'A decrease in responding to a stimulus that is presented repeatedly', 'A new resident startles at every passing train at first, but startles much less after a few weeks of hearing them. Which term describes this decrease?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Conditioned Stimulus (CS)', 'Formerly neutral stimulus eliciting respondent behavior after pairing', 'A formerly neutral stimulus that elicits respondent behavior after pairing', 'The sound of a dentist''s drill elicits muscle tension in a patient after it has been paired with painful treatment. Which term describes the sound of the drill?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Stimulus Blocking', 'A previously learned stimululs prevents a newly added stimulus in a compound from acquiring control', 'When prior conditioning of one stimulus prevents a newly added stimulus in a compound from acquiring control', 'A buzzer has been paired with a puff of air until it reliably elicits blinking. A light is then added and presented with the buzzer before each puff. Later, the light alone elicits almost no blinking. Which term describes this effect?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Respondent Extinction', 'Repeated CS presentation without US; CS loses eliciting effect', 'Repeatedly presenting a conditioned stimulus without the unconditioned stimulus, until the CS no longer elicits the response', 'A ringtone once paired with bad news is heard many times without bad news, and it gradually stops eliciting a racing heart. Which term describes this process?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Respondent Conditioning', 'Stimulus-stimulus pairing; NS with US becomes CS', 'Stimulus–stimulus pairing in which a neutral stimulus paired with an unconditioned stimulus becomes a conditioned stimulus', 'A song is repeatedly played while a person eats a favorite meal, until the song alone elicits salivation. Which process is this?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Respondent Behavior', 'Response component of reflex; elicited by antecedent stimuli', 'The response component of a reflex, elicited by antecedent stimuli', 'Which term describes the sneeze produced when pepper reaches the nose?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Unconditioned Reflex', 'Unlearned stimulus-response relation from phylogeny', 'An unlearned stimulus–response relation that is a product of the species'' evolutionary history', 'Bright light causes the pupils to constrict, with no learning involved. Which term describes this relation?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Unconditioned Stimulus (US)', 'Environmental change that elicits respondent behavior without prior learning', 'An environmental change that elicits respondent behavior without prior learning', 'A sudden loud bang elicits a startle response in a person who has never heard it before. Which term describes the bang?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Conditioned Reflex', 'Learned stimulus-response relation from environmental interactions', 'A learned stimulus–response relation resulting from interactions with the environment', 'After many takeaway meals, the sight of a restaurant''s logo elicits salivation in a regular customer. Which term describes the relation between the logo and salivation?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Neutral Stimulus (NS)', 'Stimulus change not eliciting respondent behavior', 'A stimulus change that does not elicit the respondent behavior of interest', 'Before any pairing with food, a new doorbell chime elicits no salivation in a dog. Which term describes the chime at this point?'),
('B. Concepts and Principles', 'Principles: Respondent Conditioning', 'Overshadowing', 'The more salient stimulus in a compound stimulus interferes with control by both elements', 'When stimuli are presented together as a compound, the more salient stimulus acquires control and the less salient one acquires little', 'A loud tone and a dim light are presented together before a puff of air. Later, the tone alone elicits strong blinking but the light alone barely does. Which term describes this effect?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Fixed Interval (FI)', 'Schedule in which reinforcement follows first response after fixed time since last reinforcement', 'A schedule in which reinforcement follows the first response after a fixed time has passed since the last reinforcer', 'A bakery takes a fresh batch out every 30 minutes, and the first customer to ask after each batch gets a warm loaf. Which schedule reinforces asking?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Behavioral Contrast', 'Rate change in one multiple schedule component accompanying opposite change in other', 'A change in response rate in one component of a multiple schedule, accompanied by an opposite change in the other component', 'When a teacher stops laughing at a pupil''s jokes in lessons, the pupil''s joking at lunchtime, where friends still laugh, increases. Which term describes the change at lunchtime?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Conjunctive Schedule', 'Reinforcement after completing ALL requirements for 2+ schedules', 'A schedule in which reinforcement follows completion of all the requirements of two or more schedules', 'A call-centre bonus is paid only once both 40 calls have been logged and 3 hours have passed, in either order. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Intermittent Schedule of Reinforcement', 'Some but not all behaviors produce reinforcement', 'A schedule in which some, but not all, occurrences of a behavior produce reinforcement', 'Only some casts of a fishing line catch a fish. Which type of schedule does this describe?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Fixed Ratio (FR)', 'Schedule requiring fixed number of responses for reinforcement', 'A schedule requiring a fixed number of responses for each reinforcer', 'A coffee shop gives a free drink after every eight purchases. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Behavior Chain', 'Response sequence where response produces an event which is both a reinforcer and SD for next response', 'A sequence of responses in which each response produces a stimulus change that functions both as a reinforcer for that response and as an SD for the next', 'Making tea: filling the kettle produces a full kettle that cues switching it on; the boiling water cues pouring; the poured water cues adding the teabag. Which term describes this sequence?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Lag Reinforcement Schedule', 'Reinforcement contingent on response differing from n previous responses', 'A schedule in which reinforcement depends on a response differing from a set number of previous responses', 'A design tutor praises a student''s sketch only if it uses a layout different from the student''s last two sketches. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Continuous Reinforcement (CRF)', 'Schedule providing reinforcement for each target behavior occurrence', 'A schedule that reinforces every occurrence of the target behavior', 'A ticket machine issues a ticket every time a valid card is tapped. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Concurrent Schedule', '2+ reinforcement contingencies operating independently but simultaneously for different behaviors', 'Two or more reinforcement contingencies operating independently and at the same time for different behaviors', 'During a free period, a student can earn points for spelling practice on one schedule or for maths practice on another, both available at once. Which arrangement is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Fixed-Time Schedule (FT)', 'Noncontingent stimuli delivery at constant intervals', 'Delivering a stimulus at a constant time interval, independent of behavior', 'A care-home carer checks in with each resident every 15 minutes, whatever the resident is doing. Which schedule describes the check-ins?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 1', 'Chained Schedule', 'Schedule where response requirment of 2 or more schedules arranged in a specific order need to be met. SD is correlated with each component.', 'A schedule in which the requirements of two or more schedules must be met in a set order, with a discriminative stimulus correlated with each component', 'In a laboratory, 10 lever presses turn on a green light; in the presence of the green light, the first press after 30 seconds produces food. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Multiple Schedule', 'Compound schedule with successively alternating elements and correlated discriminative stimuli', 'A compound schedule whose components alternate, each with a correlated discriminative stimulus', 'A parent reinforces homework on one schedule when a kitchen timer is running and on a different schedule when it isn''t, and the child''s responding differs between the two. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Variable Ratio (VR)', 'Schedule requiring varying response numbers for reinforcement', 'A schedule requiring a varying number of responses for each reinforcer', 'A slot machine pays out after an unpredictable number of plays, on average every 20. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Mixed Schedule', 'Compound schedule with successively alternating elements without discriminative stimuli', 'A compound schedule whose components alternate without any correlated discriminative stimuli', 'A machine sometimes delivers a reward after 5 presses and sometimes after 1 minute, with nothing to signal which rule is in effect. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Tandem Schedule', 'Chained schedule but without correlated discriminative stimuli', 'A schedule like a chained schedule, but without discriminative stimuli correlated with the components', 'A worker must finish 5 tasks and then wait 2 minutes before a break is available, with no signal when the first requirement is met. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Variable Interval (VI)', 'Reinforcing first response after variable time intervals', 'A schedule reinforcing the first response after varying intervals of time', 'Messages arrive on a phone at unpredictable times, so the first check after a message has arrived is the one that finds it. Which schedule reinforces checking?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Variable-Time Schedule (VT)', 'Noncontingent stimuli delivered at randomly varying intervals', 'Delivering a stimulus at varying time intervals, independent of behavior', 'A nurse visits a patient at unpredictable times averaging every 20 minutes, regardless of what the patient is doing. Which schedule describes the visits?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Progressive-Ratio Schedule', 'A ratio schedule requirement  increases incremenetally across a session', 'A ratio schedule in which the response requirement increases systematically after each reinforcer within a session', 'In a session, a participant earns a point after 2 key presses, then 4, then 8, and so on, until they stop responding. Which schedule is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Postreinforcement Pause', 'Absence of responding immediately after meeting a schedule requirement. Typically appears in fixed schedules', 'The absence of responding immediately after a schedule requirement has been met, typical of fixed schedules', 'After completing a batch of 50 items and being paid for it, a piece-rate worker waits a few minutes before starting the next batch. Which term describes this wait?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Ratio Strain', 'Behavioral effects (cessation in responding) from abrupt ratio requirement increases', 'A breakdown in responding caused by an abrupt increase in a ratio requirement', 'When the number of sales needed for a bonus jumps suddenly from 10 to 50, a salesperson stops making calls. Which term describes this breakdown?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Schedule Thinning', 'Gradually increasing ratio/interval schedule requirments (i.e., decreasing reinforcement rate)', 'Gradually increasing ratio or interval requirements, so reinforcement becomes less frequent', 'Over several weeks, a coach moves from praising every successful pass to every third, then every fifth. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Limited Hold', 'Reinforcement available for a finite time after it has become available in a interval schedule', 'A limit on how long reinforcement remains available once an interval schedule has made it available', 'A flash sale code appears every hour but expires 5 minutes after it appears. Which term describes the 5-minute limit?'),
('B. Concepts and Principles', 'Principles: Schedules of Reinforcement 2', 'Schedule of Reinforcement', 'Arrangements/requirements for reinforcement', 'The arrangements specifying which responses will be reinforced', 'Which term describes a rule stating that a learner earns a token after every three correct answers?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Exclusion Training', 'Conditional discrimination procedure involving novel stimulus selection preference', 'A conditional discrimination procedure based on the tendency to select a novel comparison when a novel sample is presented', 'A learner who already matches ''cup'' and ''spoon'' to their pictures hears the new word ''whisk'' and selects the one unfamiliar picture. Which procedure relies on this?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Shaping', 'Differential reinforcement of successive approximations towards a target operant response', 'Differentially reinforcing successive approximations toward a target response', 'A physiotherapist reinforces a patient for raising an arm to shoulder height, then a little higher, then fully overhead. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Simple Discrimination', 'Stimulus control by single antecedent condition', 'Stimulus control by a single antecedent condition', 'A dog sits when its owner says ''sit'' and does not sit in the absence of that word. Which term describes this?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Matching-to-Sample', 'Procedure in which conditional discrimations are arranged with sample and multiple comparison stimuli', 'A procedure arranging conditional discriminations with a sample stimulus and multiple comparison stimuli', 'A learner hears ''triangle'' and chooses the triangle from a circle, a square and a triangle. Which procedure is this?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Discriminative Stimulus for Punishment (SDp)', 'Stimulus in whose presence behavior has been punished; signals the availbility of punishment', 'A stimulus in whose presence behavior has been punished, signalling that punishment is available', 'Drivers slow down when they see a police car parked on the motorway, where speeding has previously led to fines. Which term describes the police car?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Stimulus Control', 'Antecedent stimuli reliably evoke or suppress behavior based on their previous correlation with reinforcement', 'Antecedent stimuli reliably evoking or suppressing behavior because of their previous correlation with reinforcement', 'Pedestrians reliably cross when the green figure is shown and wait when the red figure is shown. Which term describes this outcome?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Arbitrary Stimulus Class', 'Antecedent stimuli evoking same response without physical resemblance or relational aspect', 'Antecedent stimuli that evoke the same response without sharing physical resemblance or relational features', 'The spoken word ''stop'', a red octagon and a raised palm all evoke stopping. Which term describes this group of stimuli?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Stimulus Class', 'Stimuli which share common elements (formal or functional)', 'Stimuli that share common elements, either formal or functional', 'Which term describes all the stimuli that evoke the response ''vehicle'', from bicycles to buses?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Generalization Gradient', 'Graphic depiction of stimulus generalization extent', 'A graph showing the extent of stimulus generalization', 'A graph shows that a dog trained to respond to one whistle pitch responds strongly to that pitch and less and less to pitches further from it. Which term describes the graph?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Concept Formation', 'Complex stimulus control requiring generalization within class/discrimination between classes', 'Complex stimulus control requiring generalization within a class and discrimination between classes', 'A child calls all kinds of chairs ''chair'' but does not call stools or sofas ''chair''. Which term describes this repertoire?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Stimulus Delta (S∆)', 'Stimulus in whose presence behavior not reinforced', 'A stimulus in whose presence behavior has not been reinforced', 'A greyed-out ''Submit'' button on a web form has never responded when clicked. Which term describes the greyed-out button?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Discriminative Stimulus (SD)', 'Stimulus in whose presence behavior has been reinforced; signals the availability of reinforcement.', 'A stimulus in whose presence behavior has been reinforced, signalling that reinforcement is available', 'A shop''s ''Open'' sign is lit, and customers who enter while it is lit are served. Which term describes the lit sign?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Stimulus Discrimination', 'Reliably more responding in SD presence than S∆ presence', 'Reliably more responding in the presence of an SD than in the presence of an S∆', 'A cat comes to the kitchen when its food tin is opened but not when other tins are opened. Which term describes this pattern of responding?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Feature Stimulus Class', 'Stimulus class which share common physical forms/structures or relative relationships', 'A stimulus class whose members share physical forms, structures or relative relationships', 'A child labels any round object ''ball'', whatever its size or colour. Which term describes the stimuli evoking ''ball''?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Imitation', 'Behavior occasioned by model with formal similarity following closely in time', 'Behavior occasioned by a model, with formal similarity, and occurring soon after it', 'A fitness instructor demonstrates a lunge and class members immediately perform the same lunge. Which term describes the class members'' behavior?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Conditional Discrimination', 'Discrimination between comparison stimuli, conditional on a sample stimulus (e.g., Matching-to-sample)', 'Discrimination among comparison stimuli that depends on a sample stimulus', 'A warehouse picker selects the blue crate when the screen shows ''blue'' and the green crate when it shows ''green''. Which term describes this?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Response Class', 'Class of responses that may differ in topography but produce the same environmental effect', 'A class of responses that may differ in topography but produce the same effect on the environment', 'Knocking, ringing the doorbell and calling out all result in someone opening the door. Which term describes these responses?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Generalization', 'Generic term for spread of effects across stimuli or responding', 'The general term for the spread of effects across stimuli or responses', 'A learner''s new budgeting skill appears in new settings and in new forms that were never trained. Which umbrella term describes this spread?'),
('B. Concepts and Principles', 'Principles: Stimulus Control', 'Stimulus Generalization', 'Behavior evoked by stimuli sharing physical properties with previously established SD', 'Behavior evoked by stimuli that share physical properties with a previously established SD', 'A child taught to stop at a red traffic light also stops at a red flashing light at a level crossing. Which term describes this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Private Events', 'Covert events accessible only to person experiencing them', 'Covert events accessible only to the person experiencing them', 'A runner notices a stitch developing during a race. Which term describes the stitch, observable only to the runner?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Echoic', 'Elementary verbal operant; vocal response evoked by vocal SD with formal similarity', 'An elementary verbal operant in which a vocal response is evoked by a vocal SD and shares formal similarity with it', 'A language student repeats ''gracias'' immediately after the teacher says it. Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Elementary Verbal Operants', 'Skinner''s basic categories of the behaviour of the speaker, defined by environemental variables', 'Skinner''s basic categories of speaker behavior, each defined by its controlling variables', 'Which term describes the categories mand, tact, echoic and intraverbal, considered together?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Point-to-Point Correspondence', 'Stimulus and response matching beginning/middle/end', 'A match between the beginning, middle and end of the verbal stimulus and those of the response', 'A student reads the printed word ''lamp'' aloud as ''lamp'', each part of the response matching each part of the text. Which term describes this match?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Textual', 'Elementary verbal operant; response evoked by written SD without formal similarity', 'An elementary verbal operant in which a written SD evokes a vocal response, without formal similarity', 'A commuter reads a station sign aloud. Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Intraverbal', 'Verbal operant evoked by verbal SD without point-to-point correspondence', 'A verbal operant evoked by a verbal SD that has no point-to-point correspondence with the response', 'Asked ''What''s the capital of France?'', a quiz contestant answers ''Paris''. Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Mand', 'Elementary verbal operant evoked by MO followed by specific reinforcement', 'An elementary verbal operant evoked by an MO and followed by specific reinforcement', 'After hours without a drink, a hiker says ''Water, please'' and is handed water. Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Transcription', 'Spoken stimulus evokes written/typed/fingerspelled response', 'A spoken stimulus that evokes a written, typed or fingerspelled response', 'A court reporter types each word as a witness speaks. Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Rule-Governed Behavior', 'Behavior controlled by verbal statement of contingency', 'Behavior controlled by a verbal statement of a contingency', 'A traveller arrives at the airport three hours early because a friend said, ''If you''re late, they''ll close the gate.'' Which term describes arriving early?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Verbal Behavior', 'Behavior whose reinforcement is mediated by listener', 'Behavior whose reinforcement is mediated by a listener', 'A diner asks the waiter for the bill and the waiter brings it. Which term describes the diner''s behavior?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Tact', 'Elementary verbal operant evoked by nonverbal SD with generalized reinforcement', 'An elementary verbal operant evoked by a nonverbal SD and maintained by generalized reinforcement', 'On seeing snow outside, a child says ''Snow!'' and a parent says ''That''s right, it''s snowing.'' Which verbal operant is this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Listener', 'Someone providing reinforcement for speaker''s verbal behavior', 'A person who provides reinforcement for a speaker''s verbal behavior', 'A bus driver stops when a passenger says ''Next stop, please.'' Which role does the driver have in this verbal episode?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Multiple Control', 'Control of verbal behavior by more than one variable at once, or of several responses by one variable', 'Verbal behavior controlled by more than one variable at once, or several responses strengthened by one variable', 'A person says ''rain'' both because the sky is dark and because a friend has just asked about the weather. Which umbrella term describes this?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Convergent Multiple Control', 'A single verbal response controlled by more than one variable at the same time', 'A single verbal response controlled by more than one variable at the same time', 'A hungry child sees a pizza advert and says ''Pizza!'', the response being both a tact and a mand. Which term describes this control?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Divergent Multiple Control', 'A single variable that strengthens several different verbal responses', 'A single variable that strengthens several different verbal responses', 'The sight of the sea can evoke ''ocean'', ''waves'' or ''beach'' from a visitor. Which term describes this control?'),
('B. Concepts and Principles', 'Principles: Verbal Behavior', 'Autoclitic', 'Verbal behavior that depends on the speaker''s other verbal behavior and modifies its effect on the listener', 'Verbal behavior that depends on the speaker''s other verbal behavior and modifies its effect on the listener', 'A colleague says, ''I''m fairly sure the meeting is at three.'' Which term describes ''I''m fairly sure''?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Count', 'Simple tally of the number of times a behavior occurs', 'A tally of the number of times a behavior occurs', 'A teacher tallies 12 requests for help during one maths lesson. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Rate', 'Count of behavior divided by the time in which it could occur, allowing comparison across unequal observation periods', 'The number of responses divided by the time in which they could occur, allowing comparison across observation periods of different lengths', 'A typist completes 90 words in 3 minutes, recorded as 30 words per minute. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Duration', 'Total elapsed time a behavior occurs from onset to offset', 'The total time a behavior occurs, from onset to offset', 'A swimmer''s coach records how long each underwater kick sequence lasts, from the start of the first kick to the end of the last. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Interresponse Time (IRT)', 'Elapsed time between the end of one response and the onset of the next', 'The time between the end of one response and the start of the next', 'A smartwatch records the seconds between the end of one cigarette and the lighting of the next. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Celeration', 'Change in rate of responding over time (acceleration or deceleration), the core measure of Precision Teaching', 'The change in rate of responding over time (acceleration or deceleration), the core measure of Precision Teaching', 'A learner''s correct answers per minute double each week. Which measure describes this change?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Indirect Measurement', 'Measurement using secondary sources such as interviews, rating scales, or recall rather than the behavior itself', 'Measurement based on secondary sources, such as interviews, rating scales or recall, rather than the behavior itself', 'A manager completes a questionnaire estimating how often staff follow a safety procedure, without observing them. Which kind of measurement is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Operational Definition', 'Precise, observable, and measurable description of a target behavior that allows consistent identification across observers', 'A precise, observable and measurable description of a target behavior that lets different observers identify it consistently', '''Helmet use: the helmet is on the rider''s head with the chin strap fastened before the bicycle moves.'' Which term describes this description?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Trials-to-Criterion', 'Number of response opportunities needed to reach a predetermined performance standard', 'The number of response opportunities needed to reach a predetermined performance standard', 'A trainee nurse needs 14 practice attempts before completing a hand-hygiene sequence correctly 3 times in a row. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Direct Measurement', 'Quantification of the behavior of interest as it actually occurs', 'Measuring the behavior of interest as it actually occurs', 'An observer stands at a crossing and records each pedestrian who waits for the green signal. Which kind of measurement is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Permanent Product', 'Measurement of the tangible outcome or environmental effect a behavior leaves behind', 'Measuring the tangible outcome or effect a behavior leaves behind', 'A supervisor counts correctly packed boxes on the pallet at the end of a shift. Which kind of measurement is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Latency', 'Elapsed time between the onset of an antecedent stimulus and the onset of the response', 'The time between the onset of an antecedent stimulus and the onset of the response', 'A sprinter''s coach measures the time from the starting gun to the athlete''s first movement. Which measure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Topography', 'The physical form or shape of a response (what the behavior looks like)', 'The physical form or shape of a response', 'A handwriting assessment records whether letters are joined or printed. Which dimension of behavior is recorded?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C1-C4', 'Function-Based Definition', 'Definition that specifies behavior by its effect on the environment rather than its physical form', 'A definition specifying behavior by its effect on the environment rather than its physical form', 'A shop defines ''requesting assistance'' as any customer action that brings a staff member over, such as pressing a bell, waving or calling out. Which kind of definition is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Measurement Bias', 'Systematic, non-random error that distorts measured values in a consistent direction', 'Systematic, non-random error that distorts measured values in a consistent direction', 'A gym''s scale always reads 2 kg heavier than the true weight. Which term describes this error?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Momentary Time Sampling', 'Discontinuous procedure scoring behavior only if it is occurring at the moment the interval ends', 'A discontinuous procedure that scores behavior only if it is occurring at the moment the interval ends', 'At each 30-second beep, an observer notes whether a library user is reading at that instant. Which procedure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Reactivity', 'Change in behavior produced by the awareness that it is being measured', 'A change in behavior produced by awareness that it is being measured', 'Hospital staff wash their hands more often on days when an observer with a clipboard is on the ward. Which term describes this change?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Observer Drift', 'Gradual, unintended change in how an observer applies a definition over time', 'A gradual, unintended change in how an observer applies a definition over time', 'Over several months, an observer begins counting brief glances away from a screen as ''off task'', which the definition doesn''t include. Which term describes this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Reliability', 'Extent to which a measurement procedure yields consistent, repeatable results', 'The extent to which a measurement procedure produces consistent, repeatable results', 'Scoring the same video of a team meeting on two occasions produces the same count of interruptions. Which quality of measurement does this show?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Partial-Interval Recording', 'Discontinuous procedure scoring behavior if it occurs at any point during the interval; tends to overestimate duration', 'A discontinuous procedure that scores behavior if it occurs at any point in the interval; it tends to overestimate duration', 'An observer scores each 10-second interval in which a driver touches their phone at all. Which procedure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Validity', 'Extent to which a measure reflects the behavior it is intended to measure', 'The extent to which a measure reflects the behavior it is intended to measure', 'A study of reading fluency counts words read correctly per minute rather than pages turned. Which quality of measurement does this choice protect?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Continuous Measurement', 'Recording every instance of behavior during the entire observation period', 'Recording every instance of behavior throughout the observation period', 'An observer records every bite a diner takes during an entire meal. Which kind of measurement is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Interobserver Agreement', 'Degree to which two or more independent observers report the same values for the same events', 'The degree to which two or more independent observers report the same values for the same events', 'Two observers independently count 19 and 20 seatbelt checks during the same flight, giving 95% agreement. Which term describes this index?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Whole-Interval Recording', 'Discontinuous procedure scoring behavior only if it occurs throughout the entire interval; tends to underestimate duration', 'A discontinuous procedure that scores behavior only if it occurs throughout the entire interval; it tends to underestimate duration', 'An observer scores a 15-second interval only if a worker wears ear protection for the whole of it. Which procedure is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C5-C8', 'Discontinuous Measurement', 'Recording behavior during only part of the observation period, sampling rather than capturing every instance', 'Recording behavior during only part of the observation period, sampling rather than capturing every instance', 'Interval recording and time sampling are both examples of which kind of measurement?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Equal-Interval Graph', 'Graph on which equal distances on an axis represent equal absolute amounts of change', 'A graph on which equal distances on an axis represent equal absolute amounts of change', 'On a sales chart, the distance from 10 to 20 sales is the same as from 90 to 100 sales. Which kind of graph is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Dosage', 'The amount of an intervention delivered (e.g., sessions, duration, intensity) actually received by the client', 'The amount of an intervention actually received (e.g. sessions, duration, intensity)', 'A participant in a weight-management program attends 9 of 16 scheduled sessions. Which term describes the amount of intervention received?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Visual Analysis', 'Systematic inspection of graphed data for changes in level, trend, and variability to judge experimental effects', 'Systematically inspecting graphed data for changes in level, trend and variability to judge experimental effects', 'A team examines a multiple-baseline graph to judge whether each tier changed when the intervention began. Which practice is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Scatterplot', 'Graph displaying the distribution of behavior across time of day to reveal temporal patterns', 'A graph showing how behavior is distributed across times of day, revealing temporal patterns', 'A care-home record shows that a resident''s calls for staff cluster in the late afternoon. Which kind of display reveals this pattern?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Level', 'The value of behavior on the vertical axis (its magnitude) within or across conditions', 'The value of the behavior on the vertical axis (its magnitude), within or across conditions', 'A graph of a commuter''s daily cycling shows data clustering around 12 km per day. Which property of the data is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Phase Change', 'Vertical line on a graph marking a change in conditions or phases (e.g., baseline to intervention)', 'A vertical line on a graph marking a change in conditions or phases', 'Which term describes the vertical line on a graph where data collection moves from baseline to intervention?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Cumulative Record', 'Graph in which each data point adds to the previous total; slope represents rate of responding', 'A graph in which each data point adds to the previous total, so its slope shows the rate of responding', 'A runner''s graph shows total kilometres run since January, rising more steeply in training weeks. Which kind of graph is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Trend', 'The overall direction of the data path (increasing, decreasing, or zero/flat)', 'The overall direction of the data path: increasing, decreasing or flat', 'Across six sessions, a learner''s errors decrease steadily. Which property of the data describes this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Standard Celeration Chart', 'Semi-logarithmic chart on which equal distances represent equal proportional (multiplicative) change in rate', 'A semi-logarithmic chart on which equal distances represent equal proportional (multiplicative) changes in rate', 'On a chart, growth from 2 to 4 responses per minute covers the same distance as growth from 20 to 40. Which chart is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Variability', 'The degree to which data points differ from one another within a condition', 'The degree to which data points differ from one another within a condition', 'During baseline, daily step counts jump between 2,000 and 15,000. Which property of the data does this describe?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Line Graph', 'Equal-interval graph using connected data points to show level, trend, and variability across time', 'An equal-interval graph with connected data points showing level, trend and variability over time', 'Minutes of practice per day are plotted across a month on equal-interval axes, with the points joined. Which kind of graph is this?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Data Path', 'Line connecting consecutive data points within a single condition, depicting the behavior over time', 'The line connecting consecutive data points within one condition, showing behavior over time', 'Which term describes the line joining the intervention-phase points on a graph?'),
('C. Measurement, Data Display, and Interpretation', 'Measurement C10-C12', 'Treatment Fidelity', 'Degree to which an independent variable is implemented as designed', 'The degree to which an independent variable is implemented as designed', 'An observer checks whether a coach delivers each step of a training protocol as written. Which term describes what is being assessed?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Testing', 'Change in behavior caused by repeated exposure to measurement itself', 'A change in behavior caused by repeated exposure to the measurement itself', 'Employees'' scores on a safety quiz improve partly because they have taken the same quiz several times. Which threat to internal validity is this?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Confounding Variable', 'An uncontrolled variable that could account for changes in the DV', 'An uncontrolled variable that could account for changes in the dependent variable', 'A school''s attendance improves after a new reward scheme, but a new bus route started the same week. Which term describes the new bus route?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Attrition', 'Loss of participants across the study period', 'The loss of participants over the course of a study', 'A third of participants in a fitness study stop attending before the final assessment. Which term describes this?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Maturation', 'Change in behavior due to the passage of time or development rather than the IV', 'Change in behavior due to the passage of time or development rather than the independent variable', 'Over a school year, a child''s reading improves simply because they are older, independent of the intervention being studied. Which threat to internal validity is this?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'External Validity', 'The extent to which findings generalise across subjects, settings, and behaviors', 'The extent to which findings generalize across participants, settings and behaviors', 'Researchers ask whether a road-safety program that worked in one city also works in rural areas. Which kind of validity is in question?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Internal Validity', 'The extent to which the IV, rather than extraneous factors, caused the observed change', 'The extent to which the independent variable, rather than extraneous factors, caused the observed change', 'A team rules out that a change of manager, rather than their feedback program, explains improved productivity. Which kind of validity are they protecting?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Experimental Control', 'An empirical demonstration that behavior change is reliably produced by the independent variable (i.e., demonstrating functional relation)', 'Demonstrating that behavior change is reliably produced by the independent variable (i.e., a functional relation)', 'A safety team shows that hazard reports increase each time a reporting app is introduced and decrease each time it is withdrawn. Which term describes what has been demonstrated?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Dependent Variable', 'The behavior measured to detect the effect of the IV', 'The behavior measured to detect the effect of the independent variable', 'In a study of a reminder app, which term describes the number of medication doses taken on time?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Independent Variable', 'The variable the experimenter manipulates (the intervention)', 'The variable the experimenter manipulates (the intervention)', 'In a study of a reminder app, which term describes the app, which is introduced and withdrawn across phases?'),
('D. Experimental Design', 'Experimental Design D1-D3', 'Functional Relation', 'The dependency between the IV and the DV', 'A contingent relation between the independent variable on the dependent variable. ', 'Across three participants, punctuality increases each time a reminder-text procedure is introduced. Which term describes the relation between the texts and punctuality?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Group Design', 'Design comparing aggregated outcomes across groups of subjects', 'A design comparing aggregated outcomes across groups of participants', 'Researchers compare mean anxiety scores between 40 adults who received an intervention and 40 who did not. Which kind of design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Feasibility RCT', 'An RCT conducted to determine whether a larger trial can be successfully undertaken', 'A randomized trial conducted to find out whether a larger trial can be carried out successfully', 'A small randomized study checks whether enough schools will sign up and stay involved for a full evaluation. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Steady State Responding', 'Stable pattern of behavior used to predict future responding within a condition', 'A stable pattern of behavior used to predict future responding within a condition', 'Baseline data on a worker''s daily output vary very little across seven days. Which term describes this pattern?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Prediction', 'The expected continuation of responding if conditions were unchanged', 'The expected continuation of responding if conditions stayed the same', 'A researcher assumes a household''s high energy use would continue at baseline levels if no intervention were introduced. Which element of baseline logic is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Baseline', 'Repeated measurement before intervention, used as a basis for comparison', 'Repeated measurement before intervention, used as a basis for comparison', 'A smoker records cigarettes smoked each day for two weeks before a cessation program starts. Which condition is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Repeated Measurement', 'Frequent, ongoing measurement of the DV across all conditions', 'Frequent, ongoing measurement of the dependent variable across all conditions', 'A study measures a student''s reading rate at every session throughout baseline and intervention. Which feature of single-case designs is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Waitlist-Control RCT', 'An RCT in which the control group receives the intervention after the study period', 'A randomized trial in which the control group receives the intervention after the study period', 'Families randomized to the control group receive the parenting program once the six-month follow-up is complete. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Randomized Controlled Trial', 'A study in which participants are randomly assigned to conditions to evaluate the effects of an intervention', 'A study in which participants are randomly assigned to conditions to evaluate an intervention''s effects', 'Two hundred adults are randomly assigned either to an exercise program or to a control condition. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Verification', 'Demonstration that the predicted baseline level would have held without intervention', 'Demonstrating that the predicted baseline level would have continued without intervention', 'When a recycling prompt is withdrawn, recycling returns to its baseline level. Which element of baseline logic does this demonstrate?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Crossover RCT', 'An RCT in which participants receive multiple conditions in a randomized sequence', 'A randomized trial in which participants receive more than one condition in a randomized sequence', 'Each office worker uses a standing desk and a standard desk, in random order. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Cluster Randomized Controlled Trial', 'An RCT in which groups rather than individuals are randomly assigned to conditions', 'A randomized trial in which groups rather than individuals are assigned to conditions', 'Whole care homes are randomly assigned to a new staff training program or to usual practice. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Two-Arm RCT', 'An RCT with one intervention group and one comparison group.', 'A randomized trial with one intervention group and one comparison group', 'A trial compares a new tutoring program with no tutoring, using two randomized groups. Which design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Single-Case Experimental Design', 'Design demonstrating experimental control within individual subjects serving as their own controls', 'A design demonstrating experimental control within individual participants, each acting as their own control', 'A researcher compares one cyclist''s helmet use across repeated baseline and intervention phases. Which kind of design is this?'),
('D. Experimental Design', 'Experimental Design D4-D5', 'Replication', 'Repeated demonstration of the IV effect within or across subjects to confirm reliability', 'Repeated demonstration of the independent variable''s effect, within or across participants, to confirm its reliability', 'After an intervention increases one employee''s punctuality, it is introduced for a second employee with the same result. Which term describes this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Trend', 'The overall direction of the data path across a condition', 'The overall direction of the data path within a condition', 'Across six sessions, a learner''s errors decrease steadily. Which property of the data describes this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Visual Analysis', 'Systematic inspection of graphed data for changes in level, trend, and variability', 'Systematically inspecting graphed data for changes in level, trend and variability', 'A team examines a multiple-baseline graph to judge whether each tier changed when the intervention began. Which practice is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Level', 'The magnitude of the DV on the vertical axis within a condition', 'The magnitude of the dependent variable on the vertical axis within a condition', 'A graph of a commuter''s daily cycling shows data clustering around 12 km per day. Which property of the data is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Phase Change', 'Transition between conditions, marked on a graph by a vertical line', 'The transition between conditions, marked on a graph by a vertical line', 'Which term describes the vertical line on a graph where data collection moves from baseline to intervention?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Variability', 'The degree to which data points differ within a condition', 'The degree to which data points differ within a condition', 'During baseline, daily step counts jump between 2,000 and 15,000. Which property of the data does this describe?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Alternating Treatments', 'Design rapidly alternating two or more conditions to compare their effects', 'A design that rapidly alternates two or more conditions to compare their effects', 'A coach alternates two warm-up routines across sessions and compares the two data paths for sprint times. Which design is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Carryover Effect', 'Influence of one condition on behavior in a subsequent condition', 'The influence of one condition on behavior in a subsequent condition', 'Skills learned with a first teaching method continue into the second condition, inflating the second method''s results. Which term describes this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Changing-Criterion', 'Design demonstrating control by stepwise changes in a performance criterion', 'A design that demonstrates control through stepwise changes in a performance criterion', 'A daily screen-time limit is lowered in steps, and use falls to match each new limit. Which design is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Component Analysis', 'Systematic isolation of parts of a treatment package to identify the active elements', 'Systematically isolating the parts of a treatment package to identify the active elements', 'Researchers test a workplace safety package with and without its feedback component. Which kind of analysis is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Social Validity', 'The acceptability and meaningfulness of goals, procedures, and outcomes to stakeholders', 'The acceptability and meaningfulness of goals, procedures and outcomes to stakeholders', 'After a classroom intervention, teachers are asked whether it was practical and whether the changes mattered. Which property is being assessed?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Within-Subject Comparison', 'Comparison of a subject''s behavior across conditions, isolating individual effects', 'Comparing a participant''s behavior across conditions, isolating effects in the individual', 'Which term describes comparing a single runner''s sprint times in baseline and intervention phases?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Withdrawal', 'Removal of the IV to test whether behavior returns to baseline levels', 'Removing the independent variable to test whether behavior returns to baseline levels', 'A team stops posting daily feedback to see whether output drops back to its earlier level. Which step is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Sequence Effect', 'Effect of the order in which conditions are presented', 'The effect of the order in which conditions are presented', 'Results differ depending on whether participants experienced the easy or the difficult condition first. Which term describes this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Parametric Analysis', 'Variation of the value of an IV to examine how different amounts affect behavior', 'Varying the value of an independent variable to examine how different amounts affect behavior', 'Researchers compare 5, 10 and 20 minutes of daily language practice. Which kind of analysis is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Comparative Analysis', 'Comparison of two or more distinct interventions to determine relative effectiveness', 'Comparing two or more distinct interventions to determine which is more effective', 'Researchers compare peer tutoring with computer-based practice for spelling. Which kind of analysis is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Reversal Design', 'Design demonstrating control by withdrawing and reintroducing the IV', 'A design demonstrating control by withdrawing and reintroducing the independent variable', 'Recycling data are collected in phases: baseline, prompts, baseline again, then prompts again. Which design is this?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Between-Subjects Comparison', 'Comparison of outcomes across different groups of participants', 'Comparing outcomes across different groups of participants', 'Which term describes comparing the average fitness gains of a group given a training program with those of a group not given it?'),
('D. Experimental Design', 'Experimental Design D5-D9', 'Multiple-Baseline', 'Design staggering IV introduction across behaviors, settings, or subjects to show control', 'A design that staggers the introduction of the independent variable across behaviors, settings or participants to show control', 'A seatbelt campaign is started at three workplaces, one week apart, and seatbelt use rises at each only when the campaign starts there. Which design is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Curriculum-Based Assessment', 'Assessment measuring performance against the content to be taught', 'An assessment measuring performance against the content to be taught', 'Before a new term, a teacher tests which of the term''s multiplication facts each pupil can already answer. Which kind of assessment is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Contextual Fit', 'Degree to which an assessment or procedure aligns with the client''s values, resources, and setting', 'How well an assessment or procedure matches the client''s values, resources and setting', 'A clinician revises a bedtime plan so that a parent working night shifts can carry it out with the time and support available. Which consideration guided this change?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Single-Stimulus', 'Preference assessment presenting one item at a time and recording approach', 'A preference assessment that presents one item at a time and records approach', 'An occupational therapist offers one activity at a time to an older adult and records whether she engages with each. Which preference assessment format is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Criterion-Referenced Assessment', 'Assessment comparing performance to a fixed mastery standard', 'An assessment comparing performance with a fixed mastery standard', 'A lifeguard trainee is assessed on whether they can swim 400 m in under 8 minutes. Which kind of assessment is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Norm-Referenced Assessment', 'Assessment comparing performance to a representative sample of peers', 'An assessment comparing performance with a representative sample of peers', 'A vocabulary test reports that a child''s score is at the 30th percentile for their age. Which kind of assessment is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Free-Operant', 'Preference assessment recording engagement with freely available items', 'A preference assessment that records engagement with freely available items', 'Several activities are set out in a youth club, and staff record how long a teenager spends with each, with nothing removed or offered in trials. Which preference assessment format is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Paired-Stimulus', 'Preference assessment presenting two items at a time and recording selection', 'A preference assessment that presents two items at a time and records which is selected', 'Every possible pair of five snacks is offered to a child, two at a time, and the chosen snack is recorded each time. Which preference assessment format is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Preference Assessment', 'Procedure for identifying stimuli likely to function as reinforcers', 'A procedure for identifying stimuli likely to function as reinforcers', 'Before designing a staff incentive scheme, a manager asks employees to choose among possible rewards in a structured way. Which procedure is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Reinforcer Assessment', 'Direct test of whether a stimulus increases the behavior it follows', 'A direct test of whether a stimulus increases the behavior it follows', 'A researcher checks whether making music time contingent on finishing worksheets increases the number completed. Which procedure is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Multiple-Stimulus Without Replacement', 'Preference assessment presenting an array and removing each item once selected', 'A preference assessment that presents an array of items and removes each item once it is selected', 'Six leisure activities are shown to an adult; each chosen activity is removed, and the remaining ones are offered again until all have been chosen. Which preference assessment format is this?'),
('F. Behavior Assessment', 'Assessment F2-F4', 'Progressive Ratio Schedule', 'Schedule in which the response requirement increases systematically across successive reinforcers; used to assess reinforcer strength via the breakpoint', 'A schedule in which the response requirement increases systematically across successive reinforcers, used to assess reinforcer strength via the breakpoint', 'To compare two rewards, a child earns each one for 1, then 2, then 4, then 8 puzzles, and the point at which responding stops is recorded. Which schedule is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Attention Condition', 'FA test for behavior maintained by socially mediated positive reinforcement', 'A functional analysis condition testing for behavior maintained by socially mediated positive reinforcement', 'In a functional analysis, the therapist reads a magazine and gives a brief verbal reaction only after the target behavior occurs. Which condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Functional Behavior Assessment', 'Process of identifying the variables maintaining a target behavior', 'The process of identifying the variables maintaining a target behavior', 'A consultant combines staff interviews, direct observation and data review to identify what maintains an employee''s late arrivals. Which process is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Conditional Probability', 'Likelihood of a consequence given a particular antecedent or behavior', 'The likelihood of a consequence given a particular antecedent or behavior', 'Observation shows a teacher''s attention follows 6 of every 10 call-outs. Which term describes the value 0.6?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Tangible Condition', 'FA test for behavior maintained by access to preferred items', 'A functional analysis condition testing for behavior maintained by access to preferred items', 'In a functional analysis, a preferred tablet is removed and returned briefly only after the target behavior occurs. Which condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Test Condition', 'FA condition with the relevant EO present and the putative reinforcer delivered contingently, used to evoke and detect a behavioural function', 'A functional analysis condition with the relevant EO present and the suspected reinforcer delivered contingently, used to evoke and detect a behavioral function', 'Which general term describes any functional analysis condition that arranges an establishing operation and delivers the suspected reinforcer after the target behavior?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Indirect Assessment', 'Information gathered via interviews, checklists, or rating scales rather than observation', 'Information gathered through interviews, checklists or rating scales rather than observation', 'A parent completes a questionnaire about when their teenager''s arguments at home happen and what follows them. Which kind of assessment is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Alone Condition', 'FA test for behavior maintained by automatic reinforcement', 'A functional analysis condition testing for behavior maintained by automatic reinforcement', 'In a functional analysis, a person is observed in a room with no one else present and no activities available. Which condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Functional Analysis', 'Experimental manipulation of antecedents and consequences to identify behavioral function', 'Experimentally manipulating antecedents and consequences to identify the function of behavior', 'A clinician alternates attention, tangible, demand and play conditions while measuring the target behavior. Which procedure is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Control Condition', 'The baseline FA condition in which establishing operations for problem behaviour are minimized and reinforcement is freely (noncontingently) available', 'The functional analysis comparison condition, in which establishing operations are minimized and reinforcement is freely available', 'In a functional analysis, the person has free access to toys and attention, and no demands are made. Which condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Synthesised Contingency', 'FA condition combining multiple putative reinforcers into one test', 'A functional analysis condition that combines several suspected reinforcers in a single test', 'After the target behavior, the person regains a preferred activity, receives attention and has demands removed, all at once. Which kind of condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Descriptive Assessment', 'Direct observation of behavior under natural conditions without manipulation', 'Direct observation of behavior under natural conditions, without manipulation', 'For a week, a researcher records what happens before and after each argument in a shared house, without changing anything. Which kind of assessment is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'ABC Recording', 'Descriptive recording of antecedents, behavior, and consequences as they occur', 'Descriptive recording of antecedents, behaviors and consequences as they occur', 'Each time a shopper leaves a long queue, an observer notes what happened just before and just after. Which recording method is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Demand Condition', 'FA test for behavior maintained by socially mediated negative reinforcement', 'A functional analysis condition testing for behavior maintained by socially mediated negative reinforcement', 'In a functional analysis, tasks are presented and a brief break is given only after the target behavior occurs. Which condition is this?'),
('F. Behavior Assessment', 'Assessment F5-F6', 'Scatterplot', 'Recording grid revealing patterns of behavior across times of day', 'A recording grid that shows patterns of behavior across times of day', 'A care-home record shows that a resident''s calls for staff cluster in the late afternoon. Which kind of display reveals this pattern?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Undifferentiated Responding', 'Similar responding across conditions, obscuring function', 'Similar levels of responding across conditions, which obscures the function', 'In a functional analysis, the target behavior occurs at the same high rate in every condition, including the alone condition. Which outcome is this?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Multiply Controlled Behavior', 'Behavior maintained by more than one reinforcing function', 'Behavior maintained by more than one reinforcing function', 'In a functional analysis, the target behavior is elevated in both the tangible and the demand conditions, but not in the others. Which term describes this behavior?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Differentiated Responding', 'Clearly distinct response levels across conditions, indicating a function', 'Clearly different levels of responding across conditions, indicating a function', 'In a functional analysis, the target behavior occurs mainly in the attention condition and rarely elsewhere. Which outcome is this?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Habilitation', 'Outcome that increases access to reinforcement and quality of life', 'An outcome that increases a person''s access to reinforcement and quality of life', 'After learning to manage a budget and shop independently, a young adult has more choice over how they spend their time and money. Which term describes this outcome?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Pivotal Behavior', 'A behavior that, once changed, produces widespread collateral improvements', 'A behavior that, once changed, produces widespread collateral improvements', 'Teaching a child to initiate interactions with peers leads to improvements in play, language and friendships that were not directly taught. Which term describes initiating interactions here?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Social Significance', 'Importance of a target behavior to the client and their community', 'The importance of a target behavior to the client and their community', 'A team prioritizes teaching an older adult to use a video-calling app because it lets her keep in regular contact with her family. Which term describes the importance of this target to her?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Behavioral Cusp', 'A change that exposes the person to new environments and contingencies', 'A change that exposes the person to new environments and contingencies', 'After learning to drive, a young adult gains access to jobs, friends and leisure activities that were previously out of reach. Which term describes learning to drive in this case?'),
('F. Behavior Assessment', 'Assessment F7-F8', 'Scope of Competence', 'The range of services a practitioner is trained and qualified to provide', 'The range of services a practitioner is trained and qualified to provide', 'A BCBA whose training is in early-years education refers an adult with a severe feeding difficulty to a specialist. Which professional boundary guides this referral?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Avoidance', 'Behavior that prevents or postpones an aversive stimulus', 'Behavior that prevents or postpones an aversive stimulus', 'A commuter leaves home 20 minutes early so they never get caught in rush-hour traffic. Which term describes leaving early?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Reinforcer', 'A stimulus change that increases the future frequency of the behavior it follows', 'A stimulus change that increases the future frequency of the behavior it follows', 'After an employee submits a report early, the manager''s specific praise makes early submission more frequent. Which term describes the praise?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Noncontingent Reinforcement', 'Response-independent delivery of a reinforcer to reduce motivation for problem behavior', 'Delivering a reinforcer independently of behavior, which weakens the establishing operation for the target behavior', 'A teacher gives a pupil brief attention every 5 minutes regardless of behavior, and the pupil''s calling out for attention decreases. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'DRO', 'Reinforcing the absence of the target behavior for a period of time', 'Reinforcing the absence of the target behavior for a period of time', 'A nail-biter earns a point for every hour without biting. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Escape', 'Behavior that terminates an ongoing aversive stimulus', 'Behavior that ends an ongoing aversive stimulus', 'A shopper covers their ears when a fire alarm sounds during a test. Which term describes covering their ears?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'DRA', 'Reinforcing a specified alternative behavior in place of the target behavior', 'Reinforcing a specified alternative behavior in place of the target behavior', 'A teacher responds to raised hands and no longer responds to shouted answers. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'DRH', 'Reinforcing responding that occurs at or above a set rate', 'Reinforcing responding that occurs at or above a set rate', 'A warehouse bonus is paid only to workers who pick at least 120 items an hour. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Time-Based Reinforcement', 'Delivery of a putative reinforcer on a time schedule independent of behavior', 'Delivering a stimulus on a time schedule, independent of behavior', 'Which umbrella term describes any arrangement in which a stimulus arrives by the clock rather than after a response?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'DRI', 'Reinforcing a behavior physically incompatible with the target behavior', 'Reinforcing a behavior that is physically incompatible with the target behavior', 'To reduce skin-picking, a person earns points for holding a stress ball, which can''t be done while picking. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'DRL', 'Reinforcing responding that occurs at or below a set rate', 'Reinforcing responding that occurs at or below a set rate', 'A student who asks for help no more than three times per lesson earns a reward, rather than none at all. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Contingency', 'The dependent relation between a behavior and its consequence', 'The dependent relation between a behavior and its consequence', 'A parking app opens the barrier only after payment has been completed. Which term describes this dependency between paying and the barrier opening?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Negative Reinforcement', 'Removal of a stimulus following behavior that increases its future frequency', 'Removing a stimulus after behavior, which increases the behavior''s future frequency', 'Turning down the volume stops a loud advert, and a viewer turns down the volume more often during adverts. Which process is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Differential Reinforcement', 'Reinforcing one response class while withholding reinforcement for others', 'Reinforcing one response class while withholding reinforcement for others', 'A singing teacher praises notes sung in tune and gives no praise for notes that are off pitch. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Fixed-Time Schedule', 'Stimulus delivered after a fixed period regardless of responding', 'A stimulus delivered after a fixed period, regardless of responding', 'A care-home carer checks in with each resident every 15 minutes, whatever the resident is doing. Which schedule describes the check-ins?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Variable-Time Schedule', 'Stimulus delivered after varying periods regardless of responding', 'A stimulus delivered after varying periods, regardless of responding', 'A nurse visits a patient at unpredictable times averaging every 20 minutes, regardless of what the patient is doing. Which schedule describes the visits?'),
('G. Behavior-Change Procedures', 'Behavior Change G1-G3', 'Positive Reinforcement', 'Presentation of a stimulus following behavior that increases its future frequency', 'Presenting a stimulus after behavior, which increases the behavior''s future frequency', 'After an app shows a celebratory badge for each day of practice, users practise on more days. Which process is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Backup Reinforcer', 'The item or activity for which tokens are exchanged', 'The item or activity for which tokens are exchanged', 'A gym member exchanges 500 points for a free personal-training session. Which term describes the training session?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Token Economy', 'System delivering tokens exchangeable for backup reinforcers', 'A system delivering tokens that can be exchanged for backup reinforcers', 'Residents of a supported-living service earn stamps for completing chores and exchange them for outings of their choice. Which system is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Pairing', 'Presenting a neutral stimulus with an established reinforcer to condition it', 'Presenting a neutral stimulus together with an established reinforcer so that it becomes a conditioned reinforcer', 'A dog trainer says ''yes'' each time she gives a treat, until ''yes'' alone strengthens the dog''s behavior. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Motivating Operation', 'An event that alters the value of a reinforcer and the frequency of related behavior', 'An event that alters a reinforcer''s value and the frequency of related behavior', 'Missing lunch makes food a more effective reinforcer and makes all behavior that has produced food more frequent. Which term describes missing lunch?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Conditioned Reinforcer', 'A previously neutral stimulus that acquires reinforcing value through pairing', 'A previously neutral stimulus that acquires reinforcing value through pairing', 'A trainer''s ''good'' strengthens a horse''s responding only after it has been repeatedly paired with treats. Which term describes ''good''?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Stimulus Control', 'The extent to which a property of an antecedent stimulus reliably alters some dimension of responding ', 'Reliable control over a dimension of behaviour by an  antecedent stimulus ', 'Pedestrians reliably cross when the green figure is shown and wait when the red figure is shown. Which term describes this outcome?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Discriminative Stimulus', 'A stimulus in whose presence a response has been reinforced', 'A stimulus in whose presence a response has been reinforced', 'A shop''s ''Open'' sign is lit, and customers who enter while it is lit are served. Which term describes the lit sign?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Matching-to-Sample', 'Procedure selecting a comparison stimulus conditional on a sample stimulus', 'A procedure in which selecting a comparison stimulus depends on a sample stimulus', 'A learner hears ''triangle'' and chooses the triangle from a circle, a square and a triangle. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Abolishing Operation', 'An MO that decreases reinforcer value and related behavior', 'A motivating operation that decreases a reinforcer''s value and related behavior', 'After an all-you-can-eat buffet, food is a less effective reinforcer for a diner. Which term describes eating at the buffet?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Establishing Operation', 'An MO that increases reinforcer value and related behavior', 'A motivating operation that increases a reinforcer''s value and related behavior', 'After a long run on a hot day, water is a more effective reinforcer for a runner than usual. Which term describes the long run in the heat?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Simple Discrimination', 'Responding under control of a single antecedent stimulus', 'Responding controlled by a single antecedent stimulus', 'A dog sits when its owner says ''sit'' and does not sit in the absence of that word. Which term describes this?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Generalized Conditioned Reinforcer', 'A conditioned reinforcer paired with many backups, effective across motivational states', 'A conditioned reinforcer paired with many backup reinforcers, so it remains effective across different motivating operations', 'Airline miles can be exchanged for flights, hotel stays, meals or shopping, and they keep frequent flyers booking with the airline whatever else they currently lack. Which term describes the miles?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'S-Delta', 'A stimulus in whose presence a response has not been reinforced', 'A stimulus in whose presence a response has not been reinforced', 'A greyed-out ''Submit'' button on a web form has never responded when clicked. Which term describes the greyed-out button?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Stimulus Discrimination', 'Differential responding in the presence of stimuli', 'Responding reliably altered in the presence of stimuli ', 'A cat comes to the kitchen when its food tin is opened but not when other tins are opened. Which term describes this pattern of responding?'),
('G. Behavior-Change Procedures', 'Behavior Change G4-G6', 'Conditional Discrimination', 'The discriminative function of a stimulus depends on another stimulus', 'One stimulus (discriminative) depends on the presence of another stimulus (conditional)', 'A warehouse picker selects the blue crate when the screen shows ''blue'' and the green crate when it shows ''green''. Which term describes this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Least-to-Most Prompting', 'Beginning with the least intrusive prompt and increasing only as needed', 'Beginning with the least intrusive prompt and increasing intrusiveness only as needed', 'A driving instructor first waits, then gives a verbal hint, then points, and only then demonstrates, stopping as soon as the learner responds correctly. Which prompting strategy is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Prompt Delay', 'Inserting a time gap between the natural stimulus and the prompt', 'Inserting a period of time between the natural stimulus and the prompt', 'After asking ''What''s this word?'', a tutor waits a few seconds before saying the answer. Which strategy is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Modeling', 'Demonstrating a target behavior for a learner to imitate', 'Demonstrating the target behavior for the learner to imitate', 'A barista shows a trainee how to steam milk before the trainee tries it. Which prompt is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Stimulus Prompt', 'Prompt acting on the antecedent stimulus (e.g., position, salience)', 'A prompt that acts on the antecedent stimulus, such as its position or salience', 'A self-checkout highlights the correct button in bright green so shoppers press it. Which kind of prompt is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Prompt', 'A supplementary stimulus that evokes a correct response', 'A supplementary stimulus that evokes a correct response', 'A sticky note on the front door reading ''Keys?'' leads a resident to pick up their keys before leaving. Which term describes the note?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Errorless Learning', 'Prompting arranged so the learner makes few or no errors', 'Arranging prompts so that the learner makes few or no errors', 'A new cashier is shown the correct key for each item until they can press it unaided, so they almost never press the wrong key during training. Which approach is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Terminal Behavior', 'The final target response in a shaping program', 'The final target response in a shaping program', 'In a shaping program, swimming a full length unaided is the goal that every approximation leads toward. Which term describes this goal?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Stimulus Fading', 'Gradually changing a salient stimulus feature to transfer control', 'Gradually changing a prominent feature of a stimulus to transfer control', 'A worksheet prints the correct answer box in bold at first, and the bold is made lighter each day until the box looks like the others. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Prompt Fading', 'Gradual removal of prompts to transfer control to natural stimuli', 'Gradually removing prompts to transfer control to natural stimuli', 'A coach moves from guiding a golfer''s hands, to touching the wrist, to no physical contact. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Constant Time Delay', 'Prompt delay using a single fixed interval throughout', 'A prompt delay procedure using a single fixed interval throughout', 'After the first trials, a tutor always waits 4 seconds after a question before giving the answer. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Rule', 'A verbal description of an antecedent, behavior, and consequence relation', 'A verbal description of the relation among an antecedent, a behavior and a consequence', 'Which term describes the sign ''Pay before 5 p.m. and your parcel ships today''?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Most-to-Least Prompting', 'Beginning with intrusive prompts and fading to less intrusive ones', 'Beginning with the most intrusive prompts and fading to less intrusive ones', 'A rehabilitation therapist first fully guides a patient''s hand to button a shirt, then guides only the wrist, then only points. Which prompting strategy is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Successive Approximation', 'An intermediate response reinforced on the way to the terminal behavior', 'An intermediate response reinforced on the way to the terminal behavior', 'In a program to build sustained study, sitting at the desk for 5 minutes is reinforced on the way to sitting for 30. Which term describes the 5-minute response?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Generalized Imitation', 'Imitating novel modeled behaviors without specific reinforcement', 'Imitating novel modeled behaviors without specific reinforcement for doing so', 'A toddler copies a new hand game the first time an adult demonstrates it, although imitating that game has never been reinforced. Which term describes this repertoire?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Response Prompt', 'Prompt acting on behavior directly (e.g., verbal, model, physical)', 'A prompt that acts directly on behavior, such as a verbal cue, model or physical guidance', 'As a learner hesitates over a lock, an instructor says, ''Turn the key the other way.'' Which kind of prompt is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Progressive Time Delay', 'Prompt delay gradually increasing the interval over trials', 'A prompt delay procedure that gradually increases the interval across trials', 'A tutor waits 0 seconds before giving the answer at first, then 1 second, then 2, then 3. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Transfer of Stimulus Control', 'Shifting responding from a prompt to the natural discriminative stimulus', 'Shifting control of responding from a prompt to the natural discriminative stimulus', 'A trainee receptionist who first needed a model to answer the phone correctly now answers correctly whenever the phone rings. Which term describes this outcome?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Contingency-Shaped Behavior', 'Behavior controlled by direct contact with consequences', 'Behavior controlled by direct contact with consequences', 'A new barista learns how firmly to press coffee grounds by trying different pressures and tasting the results, without being told. Which term describes this behavior?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Rule-Governed Behavior', 'Behavior controlled by a verbal statement of a contingency (contingency-specifiying stimulus)', 'Behavior controlled by a verbal statement of a contingency (a contingency-specifying stimulus)', 'A traveller arrives at the airport three hours early because a friend said, ''If you''re late, they''ll close the gate.'' Which term describes arriving early?'),
('G. Behavior-Change Procedures', 'Behavior Change G7-G11', 'Shaping', 'Differential reinforcement of successive approximations toward a target behavior', 'Differentially reinforcing successive approximations toward a target behavior', 'A physiotherapist reinforces a patient for raising an arm to shoulder height, then a little higher, then fully overhead. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Interdependent Group Contingency', 'Reinforcement depends on the collective performance of the group', 'Reinforcement depends on the collective performance of the group', 'A project team gets an early finish only if every member submits their timesheet on time. Which contingency is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Response Generalization', 'Emission of untrained responses functionally similar to the trained one', 'Untrained responses that are functionally similar to the trained response', 'After being taught to say ''Thank you'', a child also starts saying ''Thanks'' and ''Cheers''. Which term describes this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Massed Trials', 'Repeated presentation of the same trial in succession', 'Presenting the same trial repeatedly in succession', 'A tutor asks ''What''s this?'' about the same picture eight times in a row. Which arrangement is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Free-Operant Procedure', 'Teaching arrangement allowing continuous, unrestricted responding', 'A teaching arrangement that allows continuous, unrestricted responding', 'During a 1-minute timing, a learner writes as many spelling words as they can, with no pause between items. Which arrangement is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Backward Chaining', 'Teaching chain steps in reverse, beginning with the last', 'Teaching the steps of a chain in reverse order, beginning with the last', 'A swimming teacher first teaches a learner to touch the wall at the end of a length, then the final strokes before it, and so on backwards. Which chaining procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Task Analysis', 'Breaking a complex skill into its component teachable steps', 'Breaking a complex skill into its component, teachable steps', 'A trainer lists the nine steps of changing a car tyre, in order. Which process is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Discrete Trial', 'A structured teaching unit with a clear antecedent, response, and consequence', 'A structured teaching unit with a clear antecedent, response and consequence', 'A tutor says ''Point to the bus'', the learner points, and the tutor says ''That''s right!'' before the next trial begins. Which teaching unit is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'General Case Analysis', 'Teaching with the full range of relevant stimulus variation to promote generalization', 'Teaching with examples that sample the full range of relevant stimulus variation, to promote generalization', 'Learners are taught to buy a ticket on several machines chosen to represent the range of designs found across a city''s stations. Which strategy is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Independent Group Contingency', 'Each member earns reinforcement based on their own behavior', 'Each group member earns reinforcement based on their own behavior', 'Each salesperson who reaches their monthly target receives a bonus, whatever colleagues achieve. Which contingency is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Forward Chaining', 'Teaching chain steps in order, beginning with the first', 'Teaching the steps of a chain in order, beginning with the first', 'A new kitchen worker is taught the first step of a recipe to mastery, then the second is added, and so on. Which chaining procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Dependent Group Contingency', 'The whole group''s reinforcement depends on one member''s behavior', 'The whole group''s reinforcement depends on one member''s behavior', 'A class earns extra break time if one nominated student meets their reading goal. Which contingency is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Total Task Presentation', 'Teaching all steps of the chain on every trial', 'Teaching all the steps of a chain on every trial', 'A trainer guides a new employee through every step of opening the shop on each practice run. Which chaining procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Programming Common Stimuli', 'Including features of the natural setting in training to aid generalization', 'Including features of the natural setting in training to aid generalization', 'Shopping skills are practised using the same baskets and tills as the local supermarket. Which strategy is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Generalization', 'Spread of behavior change across untrained stimuli, settings, or responses', 'The spread of behavior change across untrained stimuli, settings or responses', 'A learner''s new budgeting skill appears in new settings and in new forms that were never trained. Which umbrella term describes this spread?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Behavior Chain', 'A sequence of responses linked by conditioned reinforcers, each cueing the next', 'A sequence of responses linked by conditioned reinforcers, each cueing the next', 'Making tea: filling the kettle produces a full kettle that cues switching it on; the boiling water cues pouring; the poured water cues adding the teabag. Which term describes this sequence?'),
('G. Behavior-Change Procedures', 'Behavior Change G12-G15', 'Stimulus Generalization', 'Responding to stimuli that share features with the trained stimulus', 'Responding to stimuli that share features with the trained stimulus', 'A child taught to stop at a red traffic light also stops at a red flashing light at a level crossing. Which term describes this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Response Cost', 'Removal of a specified amount of a reinforcer contingent on behavior', 'Removing a specified amount of a reinforcer contingent on behavior', 'A gamer loses 50 points each time they leave a match early, and leaving early decreases. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Overcorrection', 'Contingent requirement to restore the environment and/or repeatedly practise correct behavior', 'A contingent requirement to restore the environment and/or repeatedly practise the correct behavior', 'After leaving litter at a campsite, scouts must clear the whole site and practise packing rubbish into bags. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Time-Out', 'Removing access to positive reinforcement for a period contingent on behavior', 'Removing access to positive reinforcement for a period of time, contingent on behavior', 'A football player sits on the bench for 10 minutes after a foul, missing the game during that time. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Maintenance', 'Continued performance of a behavior after intervention ends', 'Continued performance of a behavior after the intervention has ended', 'Six months after workplace coaching ends, an employee still completes daily safety checks. Which term describes this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Negative Punishment', 'Removal of a stimulus following behavior that decreases its future frequency', 'Removing a stimulus after behavior, which decreases the behavior''s future frequency', 'A streaming service suspends a user''s account for a week after sharing a password, and password sharing decreases. Which process is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Transitivity', 'Derived relation across trained pairs (if A→B and B→C then A→C)', 'A derived relation across trained pairs: if A → B and B → C, then A → C', 'After learning a word goes with a picture and the picture with a symbol, a learner chooses the symbol when given the word. Which property is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Reflexivity', 'Matching a stimulus to itself without training (A=A)', 'Matching a stimulus to itself without training (A = A)', 'Without being taught, a learner matches a photo of a key to an identical photo of the same key. Which property is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Schedule Thinning', 'Gradually reducing the rate of reinforcement to sustain behavior', 'Gradually reducing the rate of reinforcement while maintaining the behavior', 'Over several weeks, a coach moves from praising every successful pass to every third, then every fifth. Which procedure is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Positive Punishment', 'Presentation of a stimulus following behavior that decreases its future frequency', 'Presenting a stimulus after behavior, which decreases the behavior''s future frequency', 'Touching an electric fence produces a jolt, and cattle touch the fence less often. Which process is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Symmetry', 'Reversibility of a trained relation (if A→B then B→A)', 'The reversibility of a trained relation: if A → B, then B → A', 'After learning to choose a picture of a bird given the word ''bird'', a learner chooses the word when shown the picture. Which property is this?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Stimulus Equivalence', 'Emergence of untrained relations meeting reflexivity, symmetry, and transitivity', 'The emergence of untrained relations showing reflexivity, symmetry and transitivity', 'After being taught to match a printed word to a picture and the picture to a sign, a learner matches the sign and the word in both directions without training. Which term describes the class formed?'),
('G. Behavior-Change Procedures', 'Behavior Change G16-G19', 'Extinction Burst', 'Temporary increase in response rate, magnitude, or variability when reinforcement stops', 'A temporary increase in the rate, magnitude or variability of responding when reinforcement stops', 'When a lift''s call button stops working, people press it repeatedly and more forcefully before giving up. Which term describes this increase?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Systematic Review', 'A review using pre-specified, objective methods to search, evaluate, and synthesize research evidence.', 'A review using pre-specified, objective methods to search for, appraise and synthesize research evidence', 'Following a registered protocol, a team searches four databases with set criteria and rates every eligible study. Which kind of review is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Mastery Criterion', 'Predetermined performance standard defining when a goal has been met', 'A predetermined performance standard that defines when a goal has been met', 'A training plan states that a skill is mastered when performed correctly on 9 of 10 trials across two consecutive days. Which term describes this standard?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Standardised Assessment', 'Assessment administered and scored under uniform, fixed conditions', 'An assessment administered and scored under uniform, fixed conditions', 'An examiner gives a language test using a set script, timing and scoring rules that are identical for every test-taker. Which kind of assessment is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Least Restrictive Alternative', 'Principle of selecting the least intrusive intervention likely to be effective', 'Selecting the least intrusive intervention that is likely to be effective', 'A team tries a visual schedule and differential reinforcement before considering any restrictive procedure. Which principle guides this order?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Assent', 'A client''s affirmative agreement to participate (can be verbal or nonverbal)', 'A client''s affirmative agreement to take part, which may be vocal or nonvocal', 'A child who doesn''t speak walks to the therapy table and reaches for the materials. Which term describes this indication of willingness?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Nomothetic Assessment', 'Assessment based on general laws or comparisons across people', 'Assessment based on general laws or comparisons across people', 'A clinician interprets a client''s score by comparing it with general patterns found across large groups of people. Which kind of assessment is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Idiographic Assessment', 'Assessment focused on the unique characteristics and patterns of the individual', 'Assessment focused on the individual''s unique characteristics and patterns', 'A clinician tracks one client''s own sleep and activity patterns over a month to identify the conditions associated with changes in them. Which kind of assessment is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Evidence-Based Practice', 'Integration of best available research evidence with clinical expertise and client values to guide decision-making.', 'Integrating the best available research evidence with clinical expertise and client values to guide decisions', 'A behavior analyst chooses a toileting program by weighing trial evidence, her clinical experience and the family''s preferences. Which decision-making model is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Functional Behaviour Assessment', 'Process of identifying the variables maintaining a target behaviour to inform intervention', 'The process of identifying the variables that maintain a target behavior, to inform intervention', 'A consultant combines staff interviews, direct observation and data review to identify what maintains an employee''s late arrivals. Which process is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Criterion-Referenced Assessment', 'Assessment comparing performance to a fixed mastery standard rather than to others', 'An assessment comparing performance with a fixed mastery standard rather than with other people', 'A lifeguard trainee is assessed on whether they can swim 400 m in under 8 minutes. Which kind of assessment is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H1-H2', 'Terminal Behaviour', 'The final target behaviour an intervention aims to establish', 'The final target behavior that an intervention aims to establish', 'In a shaping program, swimming a full length unaided is the goal that every approximation leads toward. Which term describes this goal?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Risk of Bias', 'Umbrella terms that covers the evaluation of systematic errors in research that distort results or conclusions.', 'Overarching term to describe an assesment that reveals systematic errors in research distort its results or conclusions', 'Reviewers judge a trial likely to give distorted results because outcome assessors knew group allocation and many participants dropped out. Which overall judgment is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Publication Bias', 'Tendency for studies with positive results to be published more often than null findings.', 'The tendency for studies with positive results to be published more often than studies with null findings', 'A meta-analysis overestimates an intervention''s effect because small studies finding no effect were never published. Which bias is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Detection Bias', 'Bias arising from differences in how outcomes are measured or assessed.', 'Bias arising from differences in how outcomes are measured or assessed', 'Observers who know which pupils received an intervention rate those pupils as calmer. Which bias is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Pre-registration', 'Public registration of research or review protocols before data collection to reduce bias.', 'Publicly registering a research or review protocol before data collection, to reduce bias', 'Before recruiting, a team posts its hypotheses and analysis plan on a public registry. Which practice is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Meta-analysis', 'Quantitative synthesis combining effect sizes across studies.', 'A quantitative synthesis combining effect sizes across studies', 'Researchers combine results from 15 trials into one overall estimate of an intervention''s effect. Which method is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Efficacy', 'Effectiveness of an intervention under controlled conditions.', 'How well an intervention works under controlled conditions', 'A treatment produces a strong effect in a tightly controlled university clinic study. Which term describes this kind of evidence?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Selection Bias', 'Bias arising from systematic differences between groups at baseline.', 'Bias arising from systematic differences between groups at baseline', 'In a trial, the intervention group includes more highly experienced staff than the comparison group from the outset. Which bias is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Replacement Behaviour', 'An appropriate behavior taught to take the place of a target behavior', 'An appropriate behavior taught to take the place of a target behavior', 'An employee is taught to request a short break, so that walking out of meetings is no longer needed. Which term describes requesting a break?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Performance Bias', 'Bias due to differences in how interventions are implemented across conditions.', 'Bias due to differences in how interventions are implemented across conditions', 'Staff unintentionally give participants in the intervention group more encouragement than those in the control group. Which bias is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Heterogeneity of effect', 'Variability in effect sizes across studies.', 'Variability in effect sizes across studies', 'Some trials of a reading program find large effects and others find none. Which term describes this variation?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Effectiveness', 'Impact of an intervention in real-world settings.', 'How well an intervention works in real-world settings', 'An intervention still reduces absenteeism when delivered by ordinary managers across many companies. Which term describes this kind of evidence?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Functional Equivalence', 'The relation between two behaviours that share the same maintaining function', 'The relation between two behaviors that share the same maintaining function', 'Handing over a ''break'' card and leaving the task area both result in a break from work. Which term describes the relation between these two behaviors?'),
('H. Selecting and Implementing Interventions', 'Interventions H2-H3', 'Social Validity', 'Acceptability of the goals, procedures, and outcomes to stakeholders', 'The acceptability of goals, procedures and outcomes to stakeholders', 'After a classroom intervention, teachers are asked whether it was practical and whether the changes mattered. Which property is being assessed?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Renewal', 'Recurrence of behaviour when the context shifts away from the treatment context', 'The recurrence of behavior when the context shifts away from the treatment context', 'Nail-biting that stopped during treatment at a clinic returns during a holiday at a relative''s house. Which term describes this recurrence?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Reinstatement', 'Recurrence of behaviour following re-exposure to the maintaining reinforcer', 'The recurrence of behavior after re-exposure to the reinforcer that maintained it', 'After a parent gives in to whining once, whining that had been extinguished returns. Which term describes this recurrence?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Relapse', 'Umbrella term for recurrence of a previously reduced target behaviour', 'Overarching term for the re-emergence of a previously reduced target behavior', 'Which umbrella term describes any return of a behavior that had been reduced through intervention?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Treatment Drift', 'Gradual, unintended deviation from the intended procedure over time', 'A gradual, unintended departure from the intended procedure over time', 'Over several months, staff start giving prompts sooner than the written protocol specifies. Which term describes this?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Procedural Integrity', 'Degree to which an intervention is implemented as designed', 'The degree to which an intervention is implemented as designed', 'An observer records that 17 of 20 protocol steps were carried out correctly, giving 85%. Which term describes this measure?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Iatrogenic Effect', 'Harm inadvertently produced by an intervention itself', 'Harm unintentionally produced by the intervention itself', 'A time-out procedure leads to new escape behavior that was not present before treatment. Which term describes this harm?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Behavioural Contrast', 'Change in responding in one condition produced by altered reinforcement in another', 'A change in responding in one condition produced by altered reinforcement in another condition', 'When a teacher stops laughing at a pupil''s jokes in lessons, the pupil''s joking at lunchtime, where friends still laugh, increases. Which term describes the change at lunchtime?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Extinction Burst', 'Temporary increase in response rate, magnitude, or variability when reinforcement is withheld', 'A temporary increase in the rate, magnitude or variability of responding when reinforcement is withheld', 'When a lift''s call button stops working, people press it repeatedly and more forcefully before giving up. Which term describes this increase?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Spontaneous Recovery', 'Reappearance of an extinguished behaviour after the passage of time', 'The reappearance of an extinguished behavior after time has passed', 'After a vending machine is switched off and customers stop pressing its buttons, several press the buttons again on the first morning after the weekend. Which term describes this reappearance?'),
('H. Selecting and Implementing Interventions', 'Interventions H4-H6', 'Resurgence', 'Recurrence of a previously reinforced behaviour when a newer behaviour stops being reinforced', 'The recurrence of a previously reinforced behavior when a newer behavior stops being reinforced', 'An adult who learned to ask colleagues for help instead of leaving tasks unfinished starts leaving tasks unfinished again when colleagues stop responding to requests for help. Which term describes this return?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Needs Assessment', 'Process of identifying barriers and facilitators influencing behavior or engagement.', 'Identifying the barriers and facilitators that influence behavior or engagement', 'Before introducing a new classroom procedure, a consultant asks teachers what would make it hard to deliver. Which process is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Component Integrity', 'Measurement of correct implementation of individual steps in a protocol.', 'Measuring whether each individual step of a protocol is carried out correctly', 'An observer scores each of eight steps in a feeding protocol as correct or incorrect. Which integrity measure is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Error of Commission', 'Implementation of a procedure not specified in the protocol.', 'Carrying out a procedure that is not specified in the protocol', 'A staff member offers a choice of rewards when the protocol specifies a single fixed reward. Which kind of integrity error is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Opportunity-Based Integrity', 'Measurement of correct responses relative to opportunities to implement a procedure.', 'Measuring correct implementation relative to the opportunities to implement a procedure', 'A supervisor records that a correction was delivered on 9 of the 12 occasions when an error occurred. Which integrity measure is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Engagement', 'Degree to which participants interact with an intervention as intended.', 'The degree to which participants interact with an intervention as intended', 'Caregivers attend the sessions and complete the agreed home practice each week. Which term describes their involvement?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Error of Omission', 'Failure to implement a required component of a protocol.', 'Failing to carry out a required component of a protocol', 'A technician forgets to record data after each trial, as the protocol requires. Which kind of integrity error is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Tailoring', 'Adapting intervention components to individual characteristics to improve relevance.', 'Adapting intervention components to individual characteristics to make them more relevant', 'A clinician adjusts the examples in a social-skills program to a teenager''s interest in football. Which practice is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Performance Feedback', 'Providing data-based feedback on implementation accuracy to improve fidelity.', 'Giving data-based feedback on implementation accuracy to improve fidelity', 'A supervisor shows a technician their integrity score and discusses the steps that were missed. Which procedure is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Global Integrity', 'Overall percentage of correctly implemented components across a session.', 'The overall percentage of correctly implemented components across a session', 'A session is scored as 88% of steps correct overall, without reporting individual steps. Which integrity measure is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Response Effort', 'Amount of effort required to perform a behavior, influencing its likelihood.', 'The amount of effort a behavior requires, which influences how likely it is', 'Moving the recycling bin next to each desk increases recycling in an office. Which variable was changed?'),
('H. Selecting and Implementing Interventions', 'Interventions H6', 'Self-Tailoring', 'Allowing individuals to select intervention components based on preference.', 'Allowing individuals to select intervention components based on their preferences', 'A client chooses which of three reminder methods to use for taking medication. Which practice is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Summative Evaluation', 'Assessment of overall outcomes at the conclusion of an intervention', 'Assessing overall outcomes at the conclusion of an intervention', 'At the end of a year-long program, assessment results are compared with those from before it began. Which kind of evaluation is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Caregiver Training', 'Teaching family or staff to implement procedures accurately', 'Teaching family members or staff to implement procedures accurately', 'Grandparents are taught to use a visual schedule with their grandchild. Which term describes this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Construct Validity', 'Extent to which a measure assesses the theoretical construct it intends to', 'The extent to which a measure assesses the theoretical construct it is intended to', 'Researchers check whether a ''teamwork'' rating scale actually measures teamwork rather than general job satisfaction. Which kind of validity is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Content Validity', 'Extent to which a measure samples the full domain it claims to assess', 'The extent to which a measure samples the full domain it claims to assess', 'A numeracy test includes addition, subtraction, multiplication and division items. Which kind of validity does this coverage support?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Test-Retest Reliability', 'Consistency of a measure''s scores across repeated administrations over time', 'The consistency of a measure''s scores across repeated administrations over time', 'A questionnaire gives similar scores when the same people complete it a month apart. Which kind of reliability is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Formative Evaluation', 'Ongoing assessment used to adjust an intervention while it is in progress', 'Ongoing assessment used to adjust an intervention while it is in progress', 'A coach reviews weekly performance graphs and changes the training plan when progress stalls. Which kind of evaluation is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Behavioural Skills Training', 'Training package combining instruction, modelling, rehearsal, and feedback', 'A training package combining instruction, modeling, rehearsal and feedback', 'A supervisor describes a feeding protocol, demonstrates it, has staff practise it and gives feedback on their practice. Which training package is this?'),
('H. Selecting and Implementing Interventions', 'Interventions H7-H8', 'Criterion Validity', 'Extent to which a measure correlates with an external concurrent or predictive outcome', 'The extent to which a measure correlates with an external concurrent or predictive outcome', 'A reading screener''s scores predict pupils'' end-of-year reading levels. Which kind of validity is this?');
create temporary table content_packs on commit drop as
select q.id quiz_id, q.title, q.response_mode, c.name category
from public.quizzes q join public.quiz_categories c on c.id=q.category_id
where q.is_listed and q.quiz_mode='banked' and exists
 (select 1 from finalised_content f where lower(trim(f.pack))=lower(trim(q.title))
 and lower(trim(f.category))=lower(trim(c.name)));
-- Explicit historical typed labels checked against the complete database export.
-- Anchor aliases to existing IDs and definitions, rather than broad fuzzy matching.
create temporary table confirmed_content_aliases (
 quiz_id uuid, term_id uuid, old_label text, final_label text, old_definition text,
 primary key(quiz_id,term_id)
) on commit drop;
insert into confirmed_content_aliases values
 ('c1418c1c-474b-41a0-87e7-9eee5b832691', '45debdc8-df3c-49e7-8e01-98caf5f3c078', 'Function-Based Response Class', 'Function-Based Definition', 'Class of responses defined by common environmental effect'),
 ('b4128327-f222-47ae-8915-563452bbeec9', 'ceb5ca0e-5085-4c99-8f87-32477d9d8b7c', 'Abolishing Operation', 'Abolishing Operation (AO)', 'An MO that decreases the effectiveness of a stimulus as a reinforcer (e.g., satiation).'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '85763d02-6aec-4255-84a7-1d805352ebad', 'Conditioned MO', 'Conditioned MO (CMO)', 'An MO whose value-altering effect depends on a learning history.'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '8b3a28c8-65bc-4825-b7fc-10eb0a63fcb5', 'Establishing Operation', 'Establishing Operation (EO)', 'An MO that increases the effectiveness of a stimulus as a reinforcer (e.g., food deprivation).'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '18ce9732-fecf-42fc-b96e-d631f4d3dbe8', 'Reflexive CMO', 'Reflexive CMO (CMO-R)', 'A previously neutral stimulus that acquires MO effectiveness by preceding a situation that is worsening or improving; often functions as a warning stimulus.'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '83adf53f-4d99-4096-93e6-0a13c1e12f34', 'Surrogate CMO', 'Surrogate CMO (CMO-S)', 'A previously neutral stimulus that acquires MO effectiveness through pairing with a UMO or another CMO.'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '928dbc4f-661a-4866-be7e-2d7d60d31e99', 'Transitive CMO', 'Transitive CMO (CMO-T)', 'A stimulus that establishes the reinforcing effectiveness of another stimulus (e.g., presenting a juice box makes a straw valuable).'),
 ('b4128327-f222-47ae-8915-563452bbeec9', '7e125b55-f9dc-4e8c-9bdd-9f1fb01dd7b5', 'Unconditioned MO', 'Unconditioned MO (UMO)', 'An MO whose value-altering effect does not depend on a learning history (e.g., deprivation of oxygen, food, or sleep).'),
 ('b4de9535-8a45-4715-ac5d-0d7404354ac6', 'b633e5f3-c37c-4d5f-aff2-dcd5d990955f', 'Conditioned Stimulus', 'Conditioned Stimulus (CS)', 'Formerly neutral stimulus eliciting respondent behavior after pairing'),
 ('b4de9535-8a45-4715-ac5d-0d7404354ac6', '7a374173-3294-429c-b0f6-a579a323b308', 'Neutral Stimulus', 'Neutral Stimulus (NS)', 'Stimulus change not eliciting respondent behavior'),
 ('b4de9535-8a45-4715-ac5d-0d7404354ac6', '14d7b7cd-9a87-494e-bb51-480e173c02d6', 'Unconditioned Stimulus', 'Unconditioned Stimulus (US)', 'Environmental change that elicits respondent behavior without prior learning'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', 'db3f6527-ab63-4e87-b614-d9e5f537ed17', 'Continuous Reinforcement', 'Continuous Reinforcement (CRF)', 'Schedule providing reinforcement for each target behavior occurrence'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', 'b5ee1295-6318-4dd9-8d40-6f14f48e04a3', 'Fixed Interval Schedule', 'Fixed Interval (FI)', 'Schedule in which reinforcement follows  first response after fixed time since last reinforcement'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', '95399035-7c9d-466e-aed7-f69e72053c03', 'Fixed Ratio Schedule', 'Fixed Ratio (FR)', 'Schedule requiring fixed number of responses for reinforcement'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', 'ebd21f96-3344-475b-b2b1-6395553cc3ec', 'Fixed-Time Schedule', 'Fixed-Time Schedule (FT)', 'Noncontingent stimuli delivery at constant intervals'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', '4988c98a-e4b2-49ad-bc23-b52df69438e8', 'Intermittent Schedule', 'Intermittent Schedule of Reinforcement', 'Some but not all behaviors produce reinforcement'),
 ('ba23b405-ad64-4e65-bb4d-555ff1636319', '8a9b4db9-3b61-484d-93f1-d8a956ea05c9', 'Lag  Schedule', 'Lag Reinforcement Schedule', 'Reinforcement contingent on response differing from n previous responses'),
 ('0d30c69e-b457-4b32-96a2-ec38cba530ca', '1e16c32a-d4ff-4c91-8b15-e30e35c63177', 'Variable Interval Schedule', 'Variable Interval (VI)', 'Reinforcing first response after variable time intervals'),
 ('0d30c69e-b457-4b32-96a2-ec38cba530ca', '0b524a59-5f01-4ce9-bb25-85acd52e71d3', 'Variable Ratio Schedule', 'Variable Ratio (VR)', 'Schedule requiring varying response numbers for reinforcement'),
 ('0d30c69e-b457-4b32-96a2-ec38cba530ca', 'a5ae88bd-8d43-4659-9297-9760485ecebf', 'Variable-Time Schedule', 'Variable-Time Schedule (VT)', 'Noncontingent stimuli delivered at randomly varying intervals'),
 ('00afa93c-ac08-413b-b139-2480af605cb0', 'c24ac3d3-104a-4b59-a966-42469377b439', 'Discriminative Stimulus', 'Discriminative Stimulus (SD)', 'Stimulus in whose presence behavior has been reinforced; signals the availability of reinforcement.'),
 ('00afa93c-ac08-413b-b139-2480af605cb0', 'b1e119c6-6605-41a0-b3b4-dfcfed414e71', 'Discriminative Stimulus for Punishment', 'Discriminative Stimulus for Punishment (SDp)', 'Stimulus in whose presence behavior has been punished; signals the availbility of punishment'),
 ('00afa93c-ac08-413b-b139-2480af605cb0', '2e85d722-6b36-4a20-b446-0000590b2df9', 'Stimulus Delta', 'Stimulus Delta (S∆)', 'Stimulus in whose presence behavior not reinforced');
do $$
begin
 if exists(select 1 from confirmed_content_aliases a
   join public.quiz_term_bank t on t.id=a.term_id and t.quiz_id=a.quiz_id
   where lower(trim(t.term_text))=lower(trim(a.old_label))
   and not exists(select 1 from public.questions q where q.quiz_id=a.quiz_id
      and q.correct_term_id=a.term_id and q.prompt_kind='definition' and q.definition_variant=0
      and lower(trim(q.question_text))=lower(trim(a.old_definition)))) then
  raise exception 'A confirmed historical alias has different definition content. Nothing was committed.';
 end if;
end $$;
-- Seven confirmed omissions across two typed packs, from the full database audit.
-- Existing records keep their IDs. Inserts share the enclosing transaction.
create temporary table confirmed_missing_typed_content (
 quiz_id uuid, pack text, term text, primary key(quiz_id,term)
) on commit drop;
insert into confirmed_missing_typed_content values
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Nonequivalence Relations'),
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Contextual Control'),
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Arbitrarily Applicable Relational Responding'),
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Nodal Stimulus'),
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Mutual Entailment'),
 ('47a1c2e2-ca35-4052-9811-6e48386c030f', 'Principles: Derived Stimulus Relations', 'Distinction Relation'),
 ('b4de9535-8a45-4715-ac5d-0d7404354ac6', 'Principles: Respondent Conditioning', 'Higher-Order Conditioning (secondary conditioning)');
do $$
declare v_row record; v_term uuid; v_count integer;
begin
 for v_row in select m.*, f.original_definition from confirmed_missing_typed_content m
  join finalised_content f on f.pack=m.pack and f.term=m.term loop
  if not exists(select 1 from content_packs where quiz_id=v_row.quiz_id
    and title=v_row.pack and response_mode='typed' and category='B. Concepts and Principles') then
   raise exception 'The confirmed typed pack % was not found. Nothing was committed.',v_row.pack;
  end if;
  select count(*), (array_agg(t.id))[1] into v_count,v_term
   from public.quiz_term_bank t where t.quiz_id=v_row.quiz_id
   and lower(trim(t.term_text))=lower(trim(v_row.term));
  if v_count>1 then raise exception 'Duplicate typed term: %. Nothing was committed.',v_row.term; end if;
  if v_count=0 then
   insert into public.quiz_term_bank (quiz_id,term_text)
    values (v_row.quiz_id,v_row.term) returning id into v_term;
  end if;
  select count(*) into v_count from public.questions
   where quiz_id=v_row.quiz_id and correct_term_id=v_term;
  if v_count>1 then raise exception 'Multiple typed definitions for %. Nothing was committed.',v_row.term; end if;
  if v_count=0 then
   insert into public.questions (quiz_id,question_text,correct_term_id)
    values (v_row.quiz_id,v_row.original_definition,v_term);
  end if;
 end loop;
end $$;
create temporary table content_terms on commit drop as
select t.id term_id, t.quiz_id, f.* from finalised_content f
join content_packs p on lower(trim(p.title))=lower(trim(f.pack)) and lower(trim(p.category))=lower(trim(f.category))
join public.quiz_term_bank t on t.quiz_id=p.quiz_id and (
 -- Only the established UK/US spelling variation is normalised globally.
 replace(lower(trim(t.term_text)), 'behaviour', 'behavior') =
 replace(lower(trim(f.term)), 'behaviour', 'behavior')
 or exists(select 1 from confirmed_content_aliases a
   where a.quiz_id=t.quiz_id and a.term_id=t.id
   and lower(trim(t.term_text))=lower(trim(a.old_label))
   and f.term=a.final_label)
);
do $$
declare f record; p record; n integer; v_extra text;
begin
 for f in select distinct pack,category from finalised_content loop
  select count(*) into n from content_packs where lower(trim(title))=lower(trim(f.pack))
    and lower(trim(category))=lower(trim(f.category)) and coalesce(response_mode,'options')='options';
  if n<>1 then raise exception 'Expected exactly one listed options pack: % (%). Found %', f.pack,f.category,n; end if;
 end loop;
 if exists(select 1 from content_packs where response_mode='typed' group by title,category having count(*)>1) then
  raise exception 'More than one listed typed pack matches a content pack';
 end if;
 if exists(select 1 from content_terms group by quiz_id,term_id having count(*)>1) then
  raise exception 'More than one spreadsheet term maps to one database term. Nothing was committed.';
 end if;
 for p in select * from content_packs loop
  if coalesce(p.response_mode,'options') not in ('options','typed') then raise exception 'Unexpected response mode'; end if;
  for f in select * from finalised_content where lower(trim(pack))=lower(trim(p.title)) loop
   select count(*) into n from content_terms where quiz_id=p.quiz_id and term=f.term;
   if n<>1 then raise exception 'Term did not match uniquely: % [%; quiz %] / %. Found % matches. No changes committed.',p.title,coalesce(p.response_mode,'options'),p.quiz_id,f.term,n; end if;
  end loop;
  select string_agg(t.term_text, ', ' order by t.term_text) into v_extra from public.quiz_term_bank t where t.quiz_id=p.quiz_id
    and not exists(select 1 from content_terms ct where ct.term_id=t.id)
    and not (
      (p.title='Experimental Design D4-D5' and t.term_text='Parallel-Group RCT') or
      (p.title='Interventions H1-H2' and t.term_text='Normative Assessment') or
      (p.title='Interventions H4-H6' and t.term_text in ('Adherence','Competence','Therapeutic Drift')) or
      (p.title='Interventions H6' and t.term_text in ('Competence','Therapeutic Drift'))
    );
  if v_extra is not null then raise exception 'Unexpected extra terms in % [%; quiz %]: %. Compare with spreadsheet before importing.',p.title,coalesce(p.response_mode,'options'),p.quiz_id,v_extra; end if;
 end loop;
 for f in select * from content_terms loop
  select count(*) into n from public.questions q where q.quiz_id=f.quiz_id and q.correct_term_id=f.term_id
   and q.prompt_kind='definition' and q.definition_variant=0;
  if n<>1 then raise exception 'Expected one original definition for % / %. Found %',f.pack,f.term,n; end if;
 end loop;
end $$;
insert into public.content_revision_backup
select '20261001-finalised','term',t.id,to_jsonb(t) from public.quiz_term_bank t
where t.quiz_id in(select quiz_id from content_packs) on conflict do nothing;
insert into public.content_revision_backup
select '20261001-finalised','question',q.id,to_jsonb(q) from public.questions q
where q.quiz_id in(select quiz_id from content_packs) on conflict do nothing;
-- Apply the definitive spreadsheet labels after recording their previous values.
-- This renames spelling/confirmed label variants without replacing term IDs.
update public.quiz_term_bank t set term_text=ct.term
from content_terms ct where t.id=ct.term_id;
-- Retire rather than delete: existing attempts and foreign keys are preserved.
update public.quiz_term_bank t set is_active=exists(select 1 from content_terms ct where ct.term_id=t.id)
where t.quiz_id in(select quiz_id from content_packs);
-- Close only unfinished sets in packs whose membership changed. Completed records stay intact.
update public.adaptive_sessions s set status='abandoned'
where s.status='in_progress' and exists(select 1 from public.quiz_term_bank t where t.quiz_id=s.quiz_id and not t.is_active);
update public.questions q set question_text=ct.original_definition
from content_terms ct where q.quiz_id=ct.quiz_id and q.correct_term_id=ct.term_id
and q.prompt_kind='definition' and q.definition_variant=0;
update public.questions q set rephrased_definition=ct.rephrased_definition, context_question=ct.context_question
from content_terms ct where q.quiz_id=ct.quiz_id and q.correct_term_id=ct.term_id
and q.prompt_kind='definition' and q.definition_variant=0;

-- Views retain the underlying SELECT policies. The adaptive plan still stores
-- one question ID and one term ID per trial, including across resume/help.
create or replace view public.active_quiz_terms with(security_invoker=true) as
select * from public.quiz_term_bank where is_active;
create or replace view public.active_definition_questions with(security_invoker=true) as
select q.* from public.questions q join public.quiz_term_bank t on t.id=q.correct_term_id
where t.is_active and q.prompt_kind='definition';
grant select on public.active_quiz_terms, public.active_definition_questions to anon,authenticated;

-- Snapshot wording when each planned trial is created. Correctness and BKT
-- still use the same original question and term IDs.
alter table public.adaptive_baseline_plan add column if not exists presented_definition text,
 add column if not exists definition_variant smallint;
alter table public.adaptive_teaching_plan add column if not exists presented_definition text,
 add column if not exists definition_variant smallint;
create or replace function public.snapshot_accuracy_definition()
returns trigger language plpgsql security definer set search_path='' as $$
declare q public.questions%rowtype;
begin
 select * into q from public.questions where id=new.question_id;
 new.definition_variant:=case when nullif(trim(q.rephrased_definition),'') is not null and random()<0.5 then 1 else 0 end;
 new.presented_definition:=case when new.definition_variant=1 then q.rephrased_definition else q.question_text end;
 return new;
end $$;
revoke all on function public.snapshot_accuracy_definition() from public,anon,authenticated;
drop trigger if exists baseline_definition_snapshot on public.adaptive_baseline_plan;
create trigger baseline_definition_snapshot before insert on public.adaptive_baseline_plan
 for each row execute function public.snapshot_accuracy_definition();
drop trigger if exists teaching_definition_snapshot on public.adaptive_teaching_plan;
create trigger teaching_definition_snapshot before insert on public.adaptive_teaching_plan
 for each row execute function public.snapshot_accuracy_definition();

create or replace function public.adaptive_baseline_view(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.adaptive_sessions%rowtype;
  v_plan public.adaptive_baseline_plan%rowtype;
  v_options jsonb;
  v_correct integer;
  v_total integer;
  v_text text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into v_session from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'baseline';
  if not found then raise exception 'Baseline session not found'; end if;

  select count(*), count(*) filter (where is_correct)
    into v_total, v_correct from public.adaptive_trials where session_id = p_session_id;
  if v_session.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'sessionId', p_session_id,
      'total', v_total, 'correct', v_correct);
  end if;
  if v_session.status <> 'in_progress' then
    return jsonb_build_object('status', v_session.status, 'sessionId', p_session_id);
  end if;

  select p.* into v_plan from public.adaptive_baseline_plan p
    where p.session_id = p_session_id
      and not exists (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal)
    order by p.ordinal limit 1;
  if not found then raise exception 'Baseline plan has no remaining prompt'; end if;

  select coalesce(v_plan.presented_definition, question_text) into v_text from public.active_definition_questions where id = v_plan.question_id;
  select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.term_text) order by option_index)
    into v_options
    from unnest(v_plan.option_term_ids) with ordinality as o(term_id, option_index)
    join public.active_quiz_terms t on t.id = o.term_id;

  return jsonb_build_object('status', 'in_progress', 'sessionId', p_session_id,
    'ordinal', v_plan.ordinal, 'answered', v_total,
    'total', array_length(v_session.term_ids, 1), 'definition', v_text,
    'options', v_options);
end $$;

create or replace function public.adaptive_begin_baseline(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session_id uuid;
  v_term_ids uuid[];
  v_term_id uuid;
  v_question_id uuid;
  v_options uuid[];
  v_ordinal integer := 0;
  v_term_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(p_quiz_id::text));
  if not exists (select 1 from public.adaptive_pack_settings s
    join public.quizzes q on q.id = s.quiz_id
    where s.quiz_id = p_quiz_id and s.enabled
      and q.quiz_mode = 'banked' and coalesce(q.response_mode, 'options') = 'options') then
    raise exception 'Adaptive baseline is not enabled for this options pack';
  end if;

  select id into v_session_id from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and kind = 'baseline'
      and status = 'in_progress' order by started_at desc limit 1;
  if found then return public.adaptive_baseline_view(v_session_id); end if;
  select id into v_session_id from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and kind = 'baseline'
      and status = 'completed' order by completed_at desc limit 1;
  if found then return public.adaptive_baseline_view(v_session_id); end if;

  select array_agg(id order by random()), count(*) into v_term_ids, v_term_count
    from public.active_quiz_terms where quiz_id = p_quiz_id;
  if v_term_count < 2 or v_term_count > 30 then
    raise exception 'Baseline requires 2 to 30 terms';
  end if;
  if (select count(distinct correct_term_id) from public.active_definition_questions
      where quiz_id = p_quiz_id and correct_term_id = any(v_term_ids)) <> v_term_count then
    raise exception 'Every baseline term needs a definition';
  end if;

  insert into public.adaptive_sessions (user_id, quiz_id, kind, term_ids)
    values (auth.uid(), p_quiz_id, 'baseline', v_term_ids) returning id into v_session_id;
  foreach v_term_id in array v_term_ids loop
    select id into v_question_id from public.active_definition_questions
      where quiz_id = p_quiz_id and correct_term_id = v_term_id
      order by random() limit 1;
    select array_agg(id order by random()) into v_options
      from public.active_quiz_terms where id = any(v_term_ids);
    insert into public.adaptive_baseline_plan
      (session_id, ordinal, term_id, question_id, option_term_ids)
      values (v_session_id, v_ordinal, v_term_id, v_question_id, v_options);
    v_ordinal := v_ordinal + 1;
  end loop;
  return public.adaptive_baseline_view(v_session_id);
end $$;

create or replace function public.adaptive_answer_baseline(
  p_session_id uuid, p_ordinal integer, p_selected_term_id uuid,
  p_dont_know boolean, p_latency_ms integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_session public.adaptive_sessions%rowtype;
  v_plan public.adaptive_baseline_plan%rowtype;
  v_previous public.adaptive_trials%rowtype;
  v_next_ordinal integer;
  v_prior numeric;
  v_posterior numeric;
  v_guess numeric;
  v_numerator numeric;
  v_slip numeric;
  v_learning_rate numeric;
  v_correct boolean;
  v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into v_session from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'baseline' for update;
  if not found then raise exception 'Baseline session not found'; end if;
  select * into v_plan from public.adaptive_baseline_plan
    where session_id = p_session_id and ordinal = p_ordinal;
  if not found then raise exception 'Prompt does not belong to this session'; end if;

  -- A retried request returns the saved result without applying BKT again.
  select * into v_previous from public.adaptive_trials
    where session_id = p_session_id and ordinal = p_ordinal;
  if found then
    if v_previous.selected_term_id is distinct from p_selected_term_id or
       v_previous.dont_know is distinct from p_dont_know then
      raise exception 'This prompt already has a different saved response';
    end if;
    return public.adaptive_baseline_view(p_session_id);
  end if;

  if v_session.status <> 'in_progress' then raise exception 'Session is closed'; end if;
  if p_dont_know is null or p_dont_know = (p_selected_term_id is not null) then
    raise exception 'Choose an option or do not know';
  end if;
  if p_latency_ms is not null and (p_latency_ms < 0 or p_latency_ms > 1800000) then
    raise exception 'Invalid response time';
  end if;
  if not p_dont_know and not (p_selected_term_id = any(v_plan.option_term_ids)) then
    raise exception 'Selected term is not an option';
  end if;
  select min(ordinal) into v_next_ordinal from public.adaptive_baseline_plan p
    where p.session_id = p_session_id
      and not exists (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal);
  if p_ordinal <> v_next_ordinal then raise exception 'Answer the current prompt first'; end if;

  select s.slip, s.learning_rate into v_slip, v_learning_rate
    from public.adaptive_pack_settings s where s.quiz_id = v_session.quiz_id;
  select st.p_known into v_prior from public.adaptive_term_state st
    where st.user_id = auth.uid() and st.quiz_id = v_session.quiz_id
      and st.term_id = v_plan.term_id;
  if v_prior is null then
    select coalesce((s.prior_by_difficulty ->> m.difficulty::text)::numeric, s.fallback_prior)
      into v_prior from public.adaptive_pack_settings s
      left join public.adaptive_term_metadata m on m.term_id = v_plan.term_id
      where s.quiz_id = v_session.quiz_id;
  end if;
  v_correct := not p_dont_know and p_selected_term_id = v_plan.term_id;
  v_count := array_length(v_plan.option_term_ids, 1);
  v_guess := case when p_dont_know then 0 else 1.0 / v_count end;
  if v_correct then
    v_numerator := v_prior * (1 - v_slip);
    v_posterior := v_numerator / (v_numerator + (1 - v_prior) * v_guess);
  else
    v_numerator := v_prior * v_slip;
    v_posterior := v_numerator / (v_numerator + (1 - v_prior) * (1 - v_guess));
  end if;
  v_posterior := v_posterior + (1 - v_posterior) * v_learning_rate;

  insert into public.adaptive_trials
    (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
      support_level, option_term_ids, is_standard_format, selected_term_id,
      dont_know, is_correct, latency_ms, p_known_before, p_known_after)
    values (p_session_id, auth.uid(), v_session.quiz_id, v_plan.term_id,
      v_plan.question_id, p_ordinal, 'baseline', 0, v_plan.option_term_ids,
      true, p_selected_term_id, p_dont_know, v_correct, p_latency_ms,
      v_prior, v_posterior);
  insert into public.adaptive_term_state
    (user_id, quiz_id, term_id, p_known, n_correct, n_incorrect,
      consecutive_errors, last_seen_at, last_error_at, last_independent_correct)
    values (auth.uid(), v_session.quiz_id, v_plan.term_id, v_posterior,
      case when v_correct then 1 else 0 end,
      case when v_correct then 0 else 1 end,
      case when v_correct then 0 else 1 end,
      now(), case when v_correct then null else now() end, v_correct)
    on conflict (user_id, quiz_id, term_id) do update set
      p_known = excluded.p_known,
      n_correct = public.adaptive_term_state.n_correct + excluded.n_correct,
      n_incorrect = public.adaptive_term_state.n_incorrect + excluded.n_incorrect,
      consecutive_errors = case when v_correct then 0
        else public.adaptive_term_state.consecutive_errors + 1 end,
      last_seen_at = excluded.last_seen_at,
      last_error_at = case when v_correct then public.adaptive_term_state.last_error_at
        else excluded.last_error_at end,
      last_independent_correct = v_correct;

  if not exists (select 1 from public.adaptive_baseline_plan p
    where p.session_id = p_session_id and not exists
      (select 1 from public.adaptive_trials r
        where r.session_id = p.session_id and r.ordinal = p.ordinal)) then
    update public.adaptive_sessions set status = 'completed', completed_at = now()
      where id = p_session_id;
  end if;
  return public.adaptive_baseline_view(p_session_id);
end $$;

create or replace function public.adaptive_teaching_view(p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_options jsonb;
  v_text text;
  v_example text;
  v_answered integer;
  v_correct integer;
  v_ready integer;
  v_total integer;
  v_unlocked boolean;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching';
  if not found then raise exception 'Teaching session not found'; end if;
  select count(*), count(*) filter (where is_correct)
    into v_answered, v_correct from public.adaptive_trials
    where session_id = p_session_id and trial_type <> 'study';
  select count(*) into v_total from public.active_quiz_terms where quiz_id = s.quiz_id;
  select count(*) into v_ready from public.adaptive_term_state st
    join public.active_quiz_terms t on t.id = st.term_id
    where st.user_id = auth.uid() and st.quiz_id = s.quiz_id
      and t.quiz_id = s.quiz_id and st.certified_at is not null;
  select exists(select 1 from public.adaptive_pack_progress
    where user_id = auth.uid() and quiz_id = s.quiz_id) into v_unlocked;
  if s.status = 'completed' then
    return jsonb_build_object('status', 'completed', 'sessionId', s.id,
      'correct', v_correct, 'answered', v_answered, 'ready', v_ready,
      'terms', v_total, 'unlocked', v_unlocked);
  end if;
  if s.status <> 'in_progress' then
    return jsonb_build_object('status', s.status, 'sessionId', s.id);
  end if;
  select plan.* into p from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists
      (select 1 from public.adaptive_trials r
        where r.session_id = plan.session_id and r.ordinal = plan.ordinal)
    order by plan.ordinal limit 1;
  if not found then raise exception 'Teaching plan has no remaining prompt'; end if;
  select coalesce(p.presented_definition, question_text) into v_text from public.active_definition_questions where id = p.question_id;
  if p.support_level = 2 then
    select example_in_context into v_example from public.adaptive_term_metadata
      where term_id = p.term_id;
  end if;
  select jsonb_agg(jsonb_build_object('id', t.id, 'text', t.term_text) order by option_index)
    into v_options from unnest(p.option_term_ids) with ordinality as o(term_id, option_index)
    join public.active_quiz_terms t on t.id = o.term_id;
  return jsonb_build_object('status', 'in_progress', 'sessionId', s.id,
    'ordinal', p.ordinal, 'answered', v_answered,
    'total', (select count(*) from public.adaptive_teaching_plan where session_id = s.id),
    'ready', v_ready, 'terms', v_total, 'definition', v_text,
    'example', v_example, 'supportLevel', p.support_level, 'options', v_options);
end $$;

create or replace function public.adaptive_begin_teaching(p_quiz_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_all uuid[];
  v_picked uuid[] := '{}'::uuid[];
  v_term uuid;
  v_question uuid;
  v_options uuid[];
  v_length integer;
  v_cap integer;
  v_target_count integer;
  v_previous_session_started timestamptz;
  v_ordinal integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  perform pg_advisory_xact_lock(hashtext(auth.uid()::text), hashtext(p_quiz_id::text));
  select least(s.session_length, (select count(*) from public.active_quiz_terms where quiz_id = p_quiz_id)),
    s.independent_option_cap, greatest(1, ceil(s.target_fraction * least(s.session_length, (select count(*) from public.active_quiz_terms where quiz_id = p_quiz_id)))::integer)
    into v_length, v_cap, v_target_count
    from public.adaptive_pack_settings s where s.quiz_id = p_quiz_id and s.enabled;
  if v_length is null then raise exception 'Teaching is not enabled for this pack'; end if;
  if not exists (select 1 from public.adaptive_sessions where user_id = auth.uid()
    and quiz_id = p_quiz_id and kind = 'baseline' and status = 'completed') then
    raise exception 'Complete the baseline first';
  end if;
  select id into v_id from public.adaptive_sessions where user_id = auth.uid()
    and quiz_id = p_quiz_id and kind = 'teaching' and status = 'in_progress'
    order by started_at desc limit 1;
  if found then return public.adaptive_teaching_view(v_id); end if;
  if exists (select 1 from public.adaptive_pack_progress where user_id = auth.uid()
    and quiz_id = p_quiz_id) then
    return jsonb_build_object('status', 'unlocked');
  end if;
  select array_agg(id) into v_all from public.active_quiz_terms where quiz_id = p_quiz_id;
  select started_at into v_previous_session_started from public.adaptive_sessions
    where user_id = auth.uid() and quiz_id = p_quiz_id and status = 'completed'
    order by completed_at desc limit 1;

  -- Give about 70% of the set to highest-priority uncertified terms, then
  -- intersperse ready or stronger terms. Each term occurs at most once.
  select coalesce(array_agg(id), '{}'::uuid[]) into v_picked from (
    select t.id from public.active_quiz_terms t
    left join public.adaptive_term_state st on st.term_id = t.id
      and st.user_id = auth.uid() and st.quiz_id = p_quiz_id
    where t.quiz_id = p_quiz_id and st.certified_at is null
    order by (1 - coalesce(st.p_known, 0.3)
      + case when st.last_error_at >= v_previous_session_started then 0.2 else 0 end
      + case when exists (select 1 from public.adaptive_trials r
        where r.user_id = auth.uid() and r.quiz_id = p_quiz_id and r.term_id = t.id
          and r.selected_term_id is not null and not r.is_correct) then 0.2 else 0 end) desc,
      st.last_seen_at asc nulls first, t.id
    limit least(v_length, v_target_count)
  ) ranked;
  for v_term in
    select t.id from public.active_quiz_terms t
    left join public.adaptive_term_state st on st.term_id = t.id
      and st.user_id = auth.uid() and st.quiz_id = p_quiz_id
    where t.quiz_id = p_quiz_id and not t.id = any(v_picked)
    order by (st.certified_at is null), st.last_seen_at asc nulls first,
      st.p_known desc nulls last, t.id
  loop
    exit when array_length(v_picked, 1) >= v_length;
    v_picked := array_append(v_picked, v_term);
  end loop;
  if coalesce(array_length(v_picked, 1), 0) <> v_length then
    raise exception 'Could not build teaching set';
  end if;
  insert into public.adaptive_sessions (user_id, quiz_id, kind, term_ids)
    values (auth.uid(), p_quiz_id, 'teaching', v_all) returning id into v_id;
  for v_term in select unnest(v_picked) order by random() loop
    select id into v_question from public.active_definition_questions
      where quiz_id = p_quiz_id and correct_term_id = v_term order by random() limit 1;
    if v_question is null then raise exception 'Term needs a definition'; end if;
    select array_agg(id order by random()) into v_options from (
      select v_term as id union all
      select d.id from (select t.id from public.active_quiz_terms t
        where t.quiz_id = p_quiz_id and t.id <> v_term
        order by random() limit greatest(1, least(v_cap, array_length(v_all, 1)) - 1)) d
    ) chosen;
    insert into public.adaptive_teaching_plan
      (session_id, ordinal, term_id, question_id, option_term_ids)
      values (v_id, v_ordinal, v_term, v_question, v_options);
    v_ordinal := v_ordinal + 1;
  end loop;
  return public.adaptive_teaching_view(v_id);
end $$;

create or replace function public.adaptive_choose_help(
  p_session_id uuid, p_ordinal integer, p_level smallint
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_current integer;
  v_options uuid[];
  v_prior numeric;
  v_after numeric;
  v_rate numeric;
  v_count integer;
  v_example text;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching' for update;
  if not found or s.status <> 'in_progress' then raise exception 'Teaching session is closed'; end if;
  if p_level not in (1, 2) then raise exception 'Unknown help level'; end if;
  select min(ordinal) into v_current from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal);
  if p_ordinal is distinct from v_current then raise exception 'Select help for the current prompt'; end if;
  select * into p from public.adaptive_teaching_plan
    where session_id = s.id and ordinal = p_ordinal for update;
  if p.support_level >= p_level then return public.adaptive_teaching_view(s.id); end if;
  if p_level = 2 then
    select example_in_context into v_example from public.adaptive_term_metadata
      where term_id = p.term_id;
    if nullif(trim(v_example), '') is null then
      raise exception 'An example is not available for this term';
    end if;
  end if;
  if p.support_level = 0 then
    select reduced_option_count into v_count from public.adaptive_pack_settings
      where quiz_id = s.quiz_id;
    select array_agg(id order by random()) into v_options from (
      select p.term_id as id union all
      select d.id from (select t.id from public.active_quiz_terms t
        where t.id = any(s.term_ids) and t.id <> p.term_id
        order by random() limit greatest(1, least(v_count, array_length(s.term_ids, 1)) - 1)) d
    ) choices;
  else
    v_options := p.option_term_ids;
  end if;
  if p_level = 2 then
    select st.p_known into v_prior from public.adaptive_term_state st
      where st.user_id = auth.uid() and st.quiz_id = s.quiz_id and st.term_id = p.term_id;
    if v_prior is null then v_prior := 0.3; end if;
    select learning_rate into v_rate from public.adaptive_pack_settings where quiz_id = s.quiz_id;
    v_after := v_prior + (1 - v_prior) * v_rate;
    insert into public.adaptive_trials
      (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
       support_level, option_term_ids, is_standard_format, p_known_before, p_known_after)
      values (s.id, auth.uid(), s.quiz_id, p.term_id, p.question_id, 1000 + p.ordinal,
        'study', 2, '{}'::uuid[], false, v_prior, v_after);
    insert into public.adaptive_term_state
      (user_id, quiz_id, term_id, p_known, last_seen_at)
      values (auth.uid(), s.quiz_id, p.term_id, v_after, now())
      on conflict (user_id, quiz_id, term_id) do update set
        p_known = excluded.p_known, last_seen_at = excluded.last_seen_at;
  end if;
  update public.adaptive_teaching_plan set support_level = p_level, option_term_ids = v_options
    where session_id = s.id and ordinal = p.ordinal;
  return public.adaptive_teaching_view(s.id);
end $$;

create or replace function public.adaptive_answer_teaching(
  p_session_id uuid, p_ordinal integer, p_selected_term_id uuid,
  p_dont_know boolean, p_latency_ms integer
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s public.adaptive_sessions%rowtype;
  p public.adaptive_teaching_plan%rowtype;
  v_previous public.adaptive_trials%rowtype;
  v_current integer;
  v_prior numeric;
  v_after numeric;
  v_guess numeric;
  v_num numeric;
  v_slip numeric;
  v_rate numeric;
  v_correct boolean;
  v_term text;
  v_n integer;
  v_successes integer;
  v_latest boolean;
  v_term_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into s from public.adaptive_sessions
    where id = p_session_id and user_id = auth.uid() and kind = 'teaching' for update;
  if not found then raise exception 'Teaching session not found'; end if;
  select * into p from public.adaptive_teaching_plan
    where session_id = s.id and ordinal = p_ordinal;
  if not found then raise exception 'Prompt not found'; end if;
  select * into v_previous from public.adaptive_trials
    where session_id = s.id and ordinal = p_ordinal;
  if found then
    if v_previous.selected_term_id is distinct from p_selected_term_id or
       v_previous.dont_know is distinct from p_dont_know then
      raise exception 'This prompt already has a different saved response';
    end if;
    select term_text into v_term from public.active_quiz_terms where id = p.term_id;
    return jsonb_build_object('status', 'feedback', 'correct', v_previous.is_correct,
      'correctTerm', v_term, 'next', public.adaptive_teaching_view(s.id));
  end if;
  if s.status <> 'in_progress' then raise exception 'Session is closed'; end if;
  if p_dont_know is null or p_dont_know = (p_selected_term_id is not null) then
    raise exception 'Choose an option or do not know';
  end if;
  if p_latency_ms is not null and (p_latency_ms < 0 or p_latency_ms > 1800000) then
    raise exception 'Invalid response time';
  end if;
  if not p_dont_know and not (p_selected_term_id = any(p.option_term_ids)) then
    raise exception 'Selected term is not an option';
  end if;
  select min(ordinal) into v_current from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal);
  if p_ordinal is distinct from v_current then raise exception 'Answer the current prompt first'; end if;

  select st.p_known into v_prior from public.adaptive_term_state st
    where st.user_id = auth.uid() and st.quiz_id = s.quiz_id and st.term_id = p.term_id;
  if v_prior is null then v_prior := 0.3; end if;
  select slip, learning_rate into v_slip, v_rate from public.adaptive_pack_settings
    where quiz_id = s.quiz_id;
  v_correct := not p_dont_know and p_selected_term_id = p.term_id;
  v_n := array_length(p.option_term_ids, 1);
  v_guess := case when p_dont_know then 0 else 1.0 / v_n end;
  if v_correct then
    v_num := v_prior * (1 - v_slip);
    v_after := v_num / (v_num + (1 - v_prior) * v_guess);
  else
    v_num := v_prior * v_slip;
    v_after := v_num / (v_num + (1 - v_prior) * (1 - v_guess));
  end if;
  v_after := v_after + (1 - v_after) * v_rate;
  insert into public.adaptive_trials
    (session_id, user_id, quiz_id, term_id, question_id, ordinal, trial_type,
      support_level, option_term_ids, is_standard_format, selected_term_id,
      dont_know, is_correct, latency_ms, p_known_before, p_known_after)
    values (s.id, auth.uid(), s.quiz_id, p.term_id, p.question_id, p.ordinal,
      case when p.support_level = 0 then 'check' else 'teach' end,
      p.support_level, p.option_term_ids, p.support_level = 0,
      p_selected_term_id, p_dont_know, v_correct, p_latency_ms, v_prior, v_after);
  insert into public.adaptive_term_state
    (user_id, quiz_id, term_id, p_known, n_correct, n_incorrect,
      consecutive_errors, last_seen_at, last_error_at, last_independent_correct)
    values (auth.uid(), s.quiz_id, p.term_id, v_after,
      case when v_correct then 1 else 0 end,
      case when v_correct then 0 else 1 end,
      case when v_correct then 0 else 1 end,
      now(), case when v_correct then null else now() end,
      case when p.support_level = 0 then v_correct else null end)
    on conflict (user_id, quiz_id, term_id) do update set
      p_known = excluded.p_known,
      n_correct = public.adaptive_term_state.n_correct + excluded.n_correct,
      n_incorrect = public.adaptive_term_state.n_incorrect + excluded.n_incorrect,
      consecutive_errors = case when v_correct then 0
        else public.adaptive_term_state.consecutive_errors + 1 end,
      last_seen_at = excluded.last_seen_at,
      last_error_at = case when v_correct then public.adaptive_term_state.last_error_at
        else excluded.last_error_at end,
      last_independent_correct = case when p.support_level = 0 then v_correct
        else public.adaptive_term_state.last_independent_correct end;

  if not exists (select 1 from public.adaptive_teaching_plan plan
    where plan.session_id = s.id and not exists (select 1 from public.adaptive_trials r
      where r.session_id = plan.session_id and r.ordinal = plan.ordinal)) then
    update public.adaptive_sessions set status = 'completed', completed_at = now()
      where id = s.id;
    -- Certification uses completed sessions only. Neither support level counts.
    for v_term_id in select id from public.active_quiz_terms where quiz_id = s.quiz_id loop
      select count(distinct r.session_id) into v_successes
        from public.adaptive_trials r join public.adaptive_sessions a on a.id = r.session_id
        where r.user_id = auth.uid() and r.quiz_id = s.quiz_id and r.term_id = v_term_id
          and a.status = 'completed' and r.is_standard_format and r.support_level = 0
          and r.is_correct;
      select r.is_correct into v_latest from public.adaptive_trials r
        join public.adaptive_sessions a on a.id = r.session_id
        where r.user_id = auth.uid() and r.quiz_id = s.quiz_id and r.term_id = v_term_id
          and a.status = 'completed' and r.is_standard_format and r.support_level = 0
          and r.is_correct is not null
        order by a.completed_at desc, r.answered_at desc, r.id desc limit 1;
      update public.adaptive_term_state set certified_at =
        case when v_successes >= 2 and v_latest then coalesce(certified_at, now()) else null end
        where user_id = auth.uid() and quiz_id = s.quiz_id and term_id = v_term_id;
    end loop;
    if not exists (select 1 from public.active_quiz_terms t
      left join public.adaptive_term_state st on st.term_id = t.id
        and st.user_id = auth.uid() and st.quiz_id = s.quiz_id
      where t.quiz_id = s.quiz_id and st.certified_at is null) then
      insert into public.adaptive_pack_progress (user_id, quiz_id)
        values (auth.uid(), s.quiz_id) on conflict do nothing;
    end if;
  end if;
  select term_text into v_term from public.active_quiz_terms where id = p.term_id;
  return jsonb_build_object('status', 'feedback', 'correct', v_correct,
    'correctTerm', v_term, 'next', public.adaptive_teaching_view(s.id));
end $$;

create temporary table rollout_study_examples(pack text,term text,difficulty integer,example text,primary key(pack,term)) on commit drop;
insert into rollout_study_examples values
('Philosophy A1/A2', 'Replication', 2, 'A researcher reintroduces an intervention after baseline to see whether the effect happens again.'),
('Philosophy A1/A2', 'Correlation', 2, 'Tantrums are more frequent after nights of poor sleep, but sleep hasn''t been manipulated.'),
('Philosophy A1/A2', 'Determinism', 2, 'Assuming a child''s aggression has identifiable causes in the environment.'),
('Philosophy A1/A2', 'Functional Relation', 3, 'Problem behavior drops each time an intervention is introduced and rises each time it is withdrawn.'),
('Philosophy A1/A2', 'Independent Variable', 1, 'The token system a researcher introduces and removes.'),
('Philosophy A1/A2', 'Dependent Variable', 1, 'The number of call-outs per class period.'),
('Philosophy A1/A2', 'Experimentation', 2, 'Introducing and removing praise across sessions while measuring on-task behavior.'),
('Philosophy A1/A2', 'Description', 2, 'Recording when and where self-injury occurs over two weeks.'),
('Philosophy A1/A2', 'Prediction', 2, 'Because tantrums usually follow task demands, staff can anticipate them.'),
('Philosophy A1/A2', 'Measurement', 1, 'Counting correct words read per minute each session.'),
('Philosophy A1/A2', 'Empiricism', 2, 'Accepting that a treatment works only after seeing the data.'),
('Philosophy A1/A2', 'Control', 3, 'Showing that turning an intervention on and off reliably changes behavior.'),
('Philosophy A2/A3', 'Hypothetical Construct', 3, 'Saying a child struggles because of ''low self-esteem''.'),
('Philosophy A2/A3', 'Philosophic Doubt', 2, 'A BCBA keeps checking whether the data still support an intervention she favors.'),
('Philosophy A2/A3', 'Explanatory Fiction', 3, '''He hits because he''s aggressive'', where the evidence for aggressiveness is the hitting.'),
('Philosophy A2/A3', 'Private Events', 2, 'Silently working through a math problem, or feeling anxious before a test.'),
('Philosophy A2/A3', 'Radical Behaviorism', 3, 'Treating a client''s anxious thoughts as behavior subject to the same principles as overt behavior.'),
('Philosophy A2/A3', 'Pragmatism', 2, 'Judging a theory by whether it helps predict and change behavior.'),
('Philosophy A2/A3', 'Mentalism', 3, 'Explaining refusal by ''lack of motivation'' rather than by the conditions present.'),
('Philosophy A2/A3', 'Methodological Behaviorism', 3, 'Studying only public behavior and treating thoughts as beyond science.'),
('Philosophy A2/A3', 'Objective', 1, 'Two observers using the same definition record the same count.'),
('Philosophy A2/A3', 'Parsimony', 2, 'Checking a child can see the board before assuming a learning disorder.'),
('Philosophy A2/A3', 'Environmental Variables', 1, 'Noise level, task difficulty and who is in the room.'),
('Philosophy A2/A3', 'Selectionism', 3, 'Requests that get results persist; requests that don''t fade away.'),
('Philosophy A4/A5', 'Applied Behavior Analysis', 1, 'A team uses reinforcement to improve a student''s reading and shows experimentally that the intervention caused the change.'),
('Philosophy A4/A5', 'Effective', 3, 'A reading program raises a child''s fluency enough that they can now read classroom texts independently.'),
('Philosophy A4/A5', 'Applied', 3, 'Teaching a teenager to use public transport rather than to sort colored blocks.'),
('Philosophy A4/A5', 'Behaviorism', 2, 'Arguing that behavior should be explained by environmental variables rather than inner causes.'),
('Philosophy A4/A5', 'Translational Research', 3, 'Testing in a clinic whether laboratory findings on resurgence predict problem behavior returning when a replacement response stops being reinforced.'),
('Philosophy A4/A5', 'Technological', 2, 'A protocol written so clearly that another clinician could run it the same way.'),
('Philosophy A4/A5', 'Consequence', 1, 'After a child asks for juice, the parent hands it over.'),
('Philosophy A4/A5', 'Social Significance', 3, 'Choosing independent toileting as a target because it increases a child''s access to school and community settings.'),
('Philosophy A4/A5', 'Conceptually Systematic', 3, 'Describing a sticker chart as a token system using generalized conditioned reinforcement.'),
('Philosophy A4/A5', 'Experimental Analysis of Behavior', 3, 'Studying how pigeons'' key pecking changes under different reinforcement schedules in a controlled lab.'),
('Philosophy A4/A5', 'Generality', 2, 'A child''s new greeting skill continues months later and occurs with new people at school.'),
('Philosophy A4/A5', 'Antecedent', 1, 'The teacher says ''line up'' just before the students walk to the door.'),
('Philosophy A4/A5', 'Professional Practice', 3, 'A BCBA conducts an assessment and designs a treatment plan for a client.'),
('Philosophy A4/A5', 'Analytic', 3, 'Using a reversal design to show that problem behavior falls only when the intervention is in place.'),
('Philosophy A4/A5', 'Behavioral', 2, 'Counting how often a student raises a hand rather than rating how engaged she seems.'),
('Philosophy A4/A5', 'Three-Term Contingency', 2, 'The teacher asks a question (A), the student answers (B), the teacher praises (C).'),
('Principles: Contingencies 1', 'Empiricism', 2, 'Accepting that a treatment works only after seeing the data.'),
('Principles: Contingencies 1', 'Determinism', 2, 'Assuming a child''s aggression has identifiable causes in the environment.'),
('Principles: Contingencies 1', 'Antecedent', 1, 'The teacher says ''line up'' just before the students walk to the door.'),
('Principles: Contingencies 1', 'Consequence', 1, 'After a child asks for juice, the parent hands it over.'),
('Principles: Contingencies 1', 'Behaviorism', 2, 'Arguing that behavior should be explained by environmental variables rather than inner causes.'),
('Principles: Contingencies 1', 'Applied Behavior Analysis', 1, 'A team uses reinforcement to improve a student''s reading and shows experimentally that the intervention caused the change.'),
('Principles: Contingencies 1', 'Clicker Training', 2, 'Pairing a click with treats, then clicking each closer approximation of a dog''s sit.'),
('Principles: Contingencies 1', 'Environment', 1, 'The room, people, sounds and objects around a learner.'),
('Principles: Contingencies 1', 'Conditional Probability', 3, 'A child hits on 8 of every 10 occasions when a demand is placed: 0.8.'),
('Principles: Contingencies 1', 'Discriminated Operant', 3, 'A child asks for snacks in the kitchen but not in the classroom.'),
('Principles: Contingencies 1', 'Contingency-Shaped Behavior', 2, 'Learning to avoid a hot stove after touching it.'),
('Principles: Contingencies 1', 'Differential Reinforcement', 2, 'Praising quiet hand-raising while ignoring call-outs.'),
('Principles: Contingencies 1', 'Antecedent Stimulus Class', 3, 'A smile, wave or ''hi'' all evoke a child''s greeting.'),
('Principles: Contingencies 1', 'Behavioral Cusp', 3, 'Learning to read opens access to books, signs and messages.'),
('Principles: Contingencies 1', 'Contingency', 2, 'If homework is done, then screen time is available.'),
('Principles: Contingencies 1', 'Contingent', 2, 'Tokens are delivered only after completed worksheets.'),
('Principles: Contingencies 1', 'Behavior', 1, 'A child reaching for a cup.'),
('Principles: Contingencies 2', 'Parsimony', 2, 'Checking a child can see the board before assuming a learning disorder.'),
('Principles: Contingencies 2', 'Explanatory Fiction', 3, '''He hits because he''s aggressive'', where the evidence for aggressiveness is the hitting.'),
('Principles: Contingencies 2', 'Radical Behaviorism', 3, 'Treating a client''s anxious thoughts as behavior subject to the same principles as overt behavior.'),
('Principles: Contingencies 2', 'Pragmatism', 2, 'Judging a theory by whether it helps predict and change behavior.'),
('Principles: Contingencies 2', 'Selectionism', 3, 'Requests that get results persist; requests that don''t fade away.'),
('Principles: Contingencies 2', 'Methodological Behaviorism', 3, 'Studying only public behavior and treating thoughts as beyond science.'),
('Principles: Contingencies 2', 'Mentalism', 3, 'Explaining refusal by ''lack of motivation'' rather than by the conditions present.'),
('Principles: Contingencies 2', 'Philosophic Doubt', 2, 'A BCBA keeps checking whether the data still support an intervention she favors.'),
('Principles: Contingencies 2', 'Three-Term Contingency', 2, 'The teacher asks a question (A), the student answers (B), the teacher praises (C).'),
('Principles: Contingencies 2', 'Phylogeny', 2, 'Infants'' sucking reflex, inherited through natural selection.'),
('Principles: Contingencies 2', 'Ontogeny', 2, 'A child learning to say ''please'' through their own experiences.'),
('Principles: Contingencies 2', 'Operant Conditioning', 1, 'Praise after helping makes helping more likely in future.'),
('Principles: Contingencies 2', 'Topography', 1, 'Throwing with the left versus the right arm.'),
('Principles: Contingencies 2', 'Stimulus', 1, 'A bell ringing or a light switching on.'),
('Principles: Contingencies 2', 'Function-Based Definition', 2, 'Defining elopement as any response that takes the child beyond the classroom door.'),
('Principles: Contingencies 2', 'Satiation', 2, 'After eating many crackers, a child stops working for crackers.'),
('Principles: Contingencies 2', 'Response', 1, 'One raised hand in class.'),
('Principles: Contingencies 2', 'Functionally Equivalent', 2, 'Screaming and hitting both produce escape from demands.'),
('Principles: Contingencies 2', 'Operant Behavior', 1, 'Asking for help because asking has produced help before.'),
('Principles: Derived Stimulus Relations', 'Stimulus Equivalence', 3, 'After learning word→picture and picture→sign, matching word and sign in any direction.'),
('Principles: Derived Stimulus Relations', 'Class Expansion', 3, 'Teaching a new printed word so it joins an existing word-picture-sign class.'),
('Principles: Derived Stimulus Relations', 'Naming', 3, 'Hearing ''giraffe'' once and then both pointing to and saying ''giraffe''.'),
('Principles: Derived Stimulus Relations', 'Nonequivalence Relations', 3, '''A is bigger than B'', ''A is the opposite of B''.'),
('Principles: Derived Stimulus Relations', 'Symmetry', 2, 'After learning ''cat''→picture, choosing ''cat'' when shown the picture.'),
('Principles: Derived Stimulus Relations', 'Transitivity', 2, 'After A→B and B→C training, choosing C given A.'),
('Principles: Derived Stimulus Relations', 'Contextual Control', 3, '''Same'' and ''different'' cues change which comparison is correct.'),
('Principles: Derived Stimulus Relations', 'Arbitrary Relations', 3, 'The word ''dog'' and a picture of a dog.'),
('Principles: Derived Stimulus Relations', 'Arbitrarily Applicable Relational Responding', 3, 'Responding to a coin as ''worth more'' than a larger coin because of its value, not size.'),
('Principles: Derived Stimulus Relations', 'Combined Symmetry and Transitivity', 3, 'After A→B and B→C training, choosing A given C.'),
('Principles: Derived Stimulus Relations', 'Nodal Stimulus', 3, 'In A→B and C→B training, B is the node.'),
('Principles: Derived Stimulus Relations', 'Reflexivity', 2, 'Matching a picture of a cat to an identical picture.'),
('Principles: Derived Stimulus Relations', 'Mutual Entailment', 3, 'Learning ''A is bigger than B'' and deriving ''B is smaller than A''.'),
('Principles: Derived Stimulus Relations', 'Combinatorial Entailment', 3, 'If A is bigger than B and B is bigger than C, then A is bigger than C.'),
('Principles: Derived Stimulus Relations', 'Distinction Relation', 3, '''A cat is not a dog.'''),
('Principles: Motivating Operations', 'Establishing Operation (EO)', 2, 'Food deprivation makes food more valuable.'),
('Principles: Motivating Operations', 'Transitive CMO (CMO-T)', 3, 'Needing a screwdriver once you find a loose screw.'),
('Principles: Motivating Operations', 'Conditioned MO (CMO)', 3, 'Seeing a vending machine makes coins valuable.'),
('Principles: Motivating Operations', 'Surrogate CMO (CMO-S)', 3, 'A cinema that has been paired with being cold makes a jumper more valuable there.'),
('Principles: Motivating Operations', 'Motivating Operation (MO)', 2, 'Being thirsty makes water valuable and asking for water more likely.'),
('Principles: Motivating Operations', 'Evocative Effect', 3, 'Thirst makes asking for water more frequent.'),
('Principles: Motivating Operations', 'Unconditioned MO (UMO)', 2, 'Sleep deprivation makes rest valuable.'),
('Principles: Motivating Operations', 'Value-Altering Effect', 3, 'Hunger making food more valuable.'),
('Principles: Motivating Operations', 'Behavior-Altering Effect', 3, 'Hunger making food-seeking more frequent.'),
('Principles: Motivating Operations', 'Abative Effect', 3, 'After a big meal, requests for snacks drop.'),
('Principles: Motivating Operations', 'Reflexive CMO (CMO-R)', 3, 'A teacher picking up worksheets makes their removal valuable.'),
('Principles: Motivating Operations', 'Abolishing Operation (AO)', 2, 'Satiation on juice makes juice less valuable.'),
('Principles: Punishment', 'Conditioned Punisher', 2, 'A reprimand that suppresses behavior after pairing with loss of privileges.'),
('Principles: Punishment', 'Bonus Response Cost', 3, 'Extra tokens given at the start of the day and removed for rule breaking.'),
('Principles: Punishment', 'Negative Punishment', 1, 'Losing phone time after swearing.'),
('Principles: Punishment', 'Automatic Punishment', 2, 'Touching a hot pan and burning a finger.'),
('Principles: Punishment', 'Punisher', 2, 'The reprimand that followed the behavior.'),
('Principles: Punishment', 'Punishment', 1, 'Any consequence that makes behavior less likely.'),
('Principles: Punishment', 'Positive Punishment', 1, 'A reprimand after running in the hall reduces running.'),
('Principles: Punishment', 'Recovery from Punishment', 3, 'Running in the hall returns once reprimands stop.'),
('Principles: Punishment', 'Unconditioned Punisher', 2, 'Pain from touching something sharp.'),
('Principles: Reinforcement', 'Avoidance Contingency', 2, 'Leaving early to avoid traffic.'),
('Principles: Reinforcement', 'Generalized Conditioned Reinforcer', 2, 'Money or tokens exchangeable for many backups.'),
('Principles: Reinforcement', 'Discriminated Avoidance', 3, 'Leaving a room when a peer who teases walks in.'),
('Principles: Reinforcement', 'Unconditioned Negative Reinforcer', 3, 'Removing painful cold.'),
('Principles: Reinforcement', 'Resurgence', 3, 'Hitting returns when requests for a break stop being honored.'),
('Principles: Reinforcement', 'Automatic Reinforcement', 2, 'Rocking that produces pleasant sensory stimulation.'),
('Principles: Reinforcement', 'Negative Reinforcement', 1, 'Putting on sunglasses removes glare.'),
('Principles: Reinforcement', 'Spontaneous Recovery', 3, 'Crying returns briefly at the start of the next day''s session.'),
('Principles: Reinforcement', 'Conditioned Negative Reinforcer', 3, 'Escaping a room where a painful event has occurred before.'),
('Principles: Reinforcement', 'Extinction-Induced Variability', 3, 'A child tries new ways of asking when the usual way stops working.'),
('Principles: Reinforcement', 'Conditioned Reinforcer', 2, 'Praise that works because it has been paired with treats.'),
('Principles: Reinforcement', 'Aversive Stimulus', 2, 'A loud alarm a person escapes by covering their ears.'),
('Principles: Reinforcement', 'Positive Reinforcement', 1, 'A child gets a sticker for tidying and tidies more often.'),
('Principles: Reinforcement', 'Extinction Burst', 2, 'Pressing a broken lift button repeatedly.'),
('Principles: Reinforcement', 'Reinforcement', 1, 'Any consequence that makes a behavior more likely.'),
('Principles: Reinforcement', 'Unconditioned Reinforcer', 2, 'Food for a hungry person.'),
('Principles: Reinforcement', 'Extinction', 1, 'No longer giving attention for whining.'),
('Principles: Reinforcement', 'Automaticity of Reinforcement', 3, 'A person speaks more to someone who nods, without noticing.'),
('Principles: Reinforcement', 'Escape Contingency', 2, 'Leaving a noisy room.'),
('Principles: Respondent Conditioning', 'Higher-Order Conditioning (secondary conditioning)', 3, 'A light paired with a tone (already a CS) comes to elicit salivation.'),
('Principles: Respondent Conditioning', 'Reflex', 2, 'A puff of air and the blink it elicits.'),
('Principles: Respondent Conditioning', 'Habituation', 2, 'Startling less at a ticking clock after hearing it all day.'),
('Principles: Respondent Conditioning', 'Conditioned Stimulus (CS)', 2, 'A bell that elicits salivation after pairing with food.'),
('Principles: Respondent Conditioning', 'Stimulus Blocking', 3, 'A tone already conditioned prevents an added light from acquiring control.'),
('Principles: Respondent Conditioning', 'Respondent Extinction', 2, 'A bell presented repeatedly without food stops eliciting salivation.'),
('Principles: Respondent Conditioning', 'Respondent Conditioning', 2, 'Pairing a tone with food until the tone alone elicits salivation.'),
('Principles: Respondent Conditioning', 'Respondent Behavior', 2, 'Pupil constriction in bright light.'),
('Principles: Respondent Conditioning', 'Unconditioned Reflex', 2, 'Food in the mouth elicits salivation.'),
('Principles: Respondent Conditioning', 'Unconditioned Stimulus (US)', 2, 'Food eliciting salivation.'),
('Principles: Respondent Conditioning', 'Conditioned Reflex', 2, 'A bell eliciting salivation after pairing with food.'),
('Principles: Respondent Conditioning', 'Neutral Stimulus (NS)', 1, 'A bell before any pairing with food.'),
('Principles: Respondent Conditioning', 'Overshadowing', 3, 'In a bright light plus faint tone compound, the light acquires most control.'),
('Principles: Schedules of Reinforcement 1', 'Fixed Interval (FI)', 2, 'Checking the mail, which arrives once a day.'),
('Principles: Schedules of Reinforcement 1', 'Behavioral Contrast', 3, 'Reduced reinforcement at school raises the behavior at home.'),
('Principles: Schedules of Reinforcement 1', 'Conjunctive Schedule', 3, 'Reinforcement after 10 responses and 2 minutes have both passed.'),
('Principles: Schedules of Reinforcement 1', 'Intermittent Schedule of Reinforcement', 1, 'Praising every third correct answer.'),
('Principles: Schedules of Reinforcement 1', 'Fixed Ratio (FR)', 1, 'A token after every 5 correct problems.'),
('Principles: Schedules of Reinforcement 1', 'Behavior Chain', 3, 'Each step of handwashing produces the cue for the next.'),
('Principles: Schedules of Reinforcement 1', 'Lag Reinforcement Schedule', 3, 'Praising a greeting only if it differs from the last two used.'),
('Principles: Schedules of Reinforcement 1', 'Continuous Reinforcement (CRF)', 1, 'Praise after every correct answer while teaching a new skill.'),
('Principles: Schedules of Reinforcement 1', 'Concurrent Schedule', 3, 'Working on math for tokens or reading for praise, both available at once.'),
('Principles: Schedules of Reinforcement 1', 'Fixed-Time Schedule (FT)', 2, 'Attention every 5 minutes regardless of behavior.'),
('Principles: Schedules of Reinforcement 1', 'Chained Schedule', 3, 'Completing FR 5 turns on a light, then FI 1 min produces food.'),
('Principles: Schedules of Reinforcement 2', 'Multiple Schedule', 3, 'FR 5 when a blue light is on, FI 1 min when a red light is on.'),
('Principles: Schedules of Reinforcement 2', 'Variable Ratio (VR)', 1, 'A slot machine paying out after an unpredictable number of plays.'),
('Principles: Schedules of Reinforcement 2', 'Mixed Schedule', 3, 'FR 5 and FI 1 min alternate with no signal about which is active.'),
('Principles: Schedules of Reinforcement 2', 'Tandem Schedule', 3, 'FR 5 then FI 1 min must be completed in order, with no signal for each.'),
('Principles: Schedules of Reinforcement 2', 'Variable Interval (VI)', 2, 'Checking for texts that arrive at unpredictable times.'),
('Principles: Schedules of Reinforcement 2', 'Variable-Time Schedule (VT)', 2, 'Attention delivered on average every 5 minutes regardless of behavior.'),
('Principles: Schedules of Reinforcement 2', 'Progressive-Ratio Schedule', 3, 'FR 2, then FR 4, then FR 8 within a session until responding stops.'),
('Principles: Schedules of Reinforcement 2', 'Postreinforcement Pause', 2, 'Pausing before starting the next set of problems after a break.'),
('Principles: Schedules of Reinforcement 2', 'Ratio Strain', 2, 'A student stops working when tokens suddenly require 20 problems instead of 5.'),
('Principles: Schedules of Reinforcement 2', 'Schedule Thinning', 2, 'Moving from FR 1 to FR 3 to FR 5 over weeks.'),
('Principles: Schedules of Reinforcement 2', 'Limited Hold', 3, 'A bus waits only 2 minutes at the stop.'),
('Principles: Schedules of Reinforcement 2', 'Schedule of Reinforcement', 1, 'Deciding to praise every fifth correct response.'),
('Principles: Stimulus Control', 'Exclusion Training', 3, 'Selecting a new picture when a new word is spoken, excluding known pictures.'),
('Principles: Stimulus Control', 'Shaping', 2, 'Reinforcing ''b'', then ''ba'', then ''ball''.'),
('Principles: Stimulus Control', 'Simple Discrimination', 2, 'Saying ''dog'' only when a dog is present.'),
('Principles: Stimulus Control', 'Matching-to-Sample', 2, 'Seeing the word ''cat'' and choosing the matching picture from three.'),
('Principles: Stimulus Control', 'Discriminative Stimulus for Punishment (SDp)', 3, 'Swearing stops when a strict teacher enters.'),
('Principles: Stimulus Control', 'Stimulus Control', 2, 'A child answers the phone only when it rings.'),
('Principles: Stimulus Control', 'Arbitrary Stimulus Class', 3, 'The printed word ''5'', a picture of five dots and ''five'' spoken all evoke the same response.'),
('Principles: Stimulus Control', 'Stimulus Class', 2, 'All stimuli that evoke the response ''fruit''.'),
('Principles: Stimulus Control', 'Generalization Gradient', 3, 'A graph of responding to tones further and further from the trained tone.'),
('Principles: Stimulus Control', 'Concept Formation', 3, 'Calling all dogs ''dog'' but not calling cats ''dog''.'),
('Principles: Stimulus Control', 'Stimulus Delta (S∆)', 2, 'A ''closed'' sign on a shop.'),
('Principles: Stimulus Control', 'Discriminative Stimulus (SD)', 1, 'An ''open'' sign on a shop.'),
('Principles: Stimulus Control', 'Stimulus Discrimination', 2, 'Asking Mum for sweets but not Dad.'),
('Principles: Stimulus Control', 'Feature Stimulus Class', 2, 'All red objects, whatever their shape.'),
('Principles: Stimulus Control', 'Imitation', 2, 'Clapping right after a teacher claps.'),
('Principles: Stimulus Control', 'Conditional Discrimination', 3, 'Picking the red card when told ''red'', the blue card when told ''blue''.'),
('Principles: Stimulus Control', 'Response Class', 2, 'Pointing, reaching and saying ''cup'' all get the cup.'),
('Principles: Stimulus Control', 'Generalization', 2, 'Behavior change spreading to new stimuli or new responses.'),
('Principles: Stimulus Control', 'Stimulus Generalization', 2, 'A child who learned ''dog'' with a terrier also says ''dog'' for a poodle.'),
('Principles: Verbal Behavior', 'Private Events', 2, 'Silently working through a math problem, or feeling anxious before a test.'),
('Principles: Verbal Behavior', 'Echoic', 2, 'Saying ''ball'' after hearing ''ball''.'),
('Principles: Verbal Behavior', 'Elementary Verbal Operants', 2, 'Mand, tact, echoic, intraverbal and so on.'),
('Principles: Verbal Behavior', 'Point-to-Point Correspondence', 3, 'Hearing ''dog'' and saying ''dog'': each part matches.'),
('Principles: Verbal Behavior', 'Textual', 2, 'Reading the word ''cat'' aloud.'),
('Principles: Verbal Behavior', 'Intraverbal', 2, 'Answering ''dog'' to ''What barks?'''),
('Principles: Verbal Behavior', 'Mand', 1, 'Saying ''juice'' when thirsty and getting juice.'),
('Principles: Verbal Behavior', 'Transcription', 3, 'Writing down words during dictation.'),
('Principles: Verbal Behavior', 'Rule-Governed Behavior', 2, 'Wearing a seatbelt because you were told it prevents injury.'),
('Principles: Verbal Behavior', 'Verbal Behavior', 1, 'Asking a friend for a pen and receiving it.'),
('Principles: Verbal Behavior', 'Tact', 1, 'Saying ''airplane'' when seeing one and receiving praise.'),
('Principles: Verbal Behavior', 'Listener', 2, 'A parent who hands over a cup when the child says ''cup''.'),
('Principles: Verbal Behavior', 'Multiple Control', 3, 'Saying ''coffee'' is evoked both by seeing the pot and by being tired.'),
('Principles: Verbal Behavior', 'Convergent Multiple Control', 3, 'A child says ''cookie'' because they see a cookie and also want one (tact and mand).'),
('Principles: Verbal Behavior', 'Divergent Multiple Control', 3, 'Seeing a dog can evoke ''dog'', ''puppy'' or ''woof''.'),
('Principles: Verbal Behavior', 'Autoclitic', 3, '''I think it''s raining'': ''I think'' tells the listener how certain the speaker is.'),
('Measurement C1-C4', 'Count', 1, 'Recording 7 call-outs in a lesson.'),
('Measurement C1-C4', 'Rate', 2, '14 correct answers in 2 minutes: 7 per minute.'),
('Measurement C1-C4', 'Duration', 1, 'A tantrum lasting 4 minutes.'),
('Measurement C1-C4', 'Interresponse Time (IRT)', 3, 'Twelve seconds between one bite and the next.'),
('Measurement C1-C4', 'Celeration', 3, 'Correct words per minute doubling each week: ×2 celeration.'),
('Measurement C1-C4', 'Indirect Measurement', 2, 'A parent''s rating of how often tantrums happen.'),
('Measurement C1-C4', 'Operational Definition', 1, '''Hitting: forceful contact of an open or closed hand with another person.'''),
('Measurement C1-C4', 'Trials-to-Criterion', 2, 'A learner needs 24 trials to reach 90% correct.'),
('Measurement C1-C4', 'Direct Measurement', 1, 'Counting hand-raises as they happen.'),
('Measurement C1-C4', 'Permanent Product', 2, 'Counting completed worksheet problems after class.'),
('Measurement C1-C4', 'Latency', 2, 'Twenty seconds between ''line up'' and the child standing.'),
('Measurement C1-C4', 'Topography', 1, 'Throwing with the left versus the right arm.'),
('Measurement C1-C4', 'Function-Based Definition', 2, 'Defining elopement as any response that takes the child beyond the classroom door.'),
('Measurement C5-C8', 'Measurement Bias', 2, 'A clock running fast so every duration is recorded too long.'),
('Measurement C5-C8', 'Momentary Time Sampling', 2, 'Checking at each 1-minute beep whether a student is on task.'),
('Measurement C5-C8', 'Reactivity', 2, 'A class behaving better when an observer enters.'),
('Measurement C5-C8', 'Observer Drift', 2, 'An observer counting milder hits as the weeks go by.'),
('Measurement C5-C8', 'Reliability', 2, 'Repeated measurement of the same behavior gives the same values.'),
('Measurement C5-C8', 'Partial-Interval Recording', 2, 'Scoring an interval if any hand-flapping occurs in it.'),
('Measurement C5-C8', 'Validity', 2, 'Measuring actual reading, not time spent holding a book.'),
('Measurement C5-C8', 'Continuous Measurement', 1, 'Recording every bite during a meal.'),
('Measurement C5-C8', 'Interobserver Agreement', 2, 'Two observers'' counts of 18 and 20 give 90% agreement.'),
('Measurement C5-C8', 'Whole-Interval Recording', 2, 'Scoring an interval only if a child is on task for all of it.'),
('Measurement C5-C8', 'Discontinuous Measurement', 2, 'Interval recording and time sampling.'),
('Measurement C10-C12', 'Equal-Interval Graph', 2, 'A graph where 10 to 20 takes the same space as 90 to 100.'),
('Measurement C10-C12', 'Dosage', 3, 'A child attending 12 of 20 scheduled sessions.'),
('Measurement C10-C12', 'Visual Analysis', 2, 'Checking level, trend and variability across baseline and intervention.'),
('Measurement C10-C12', 'Scatterplot', 2, 'A grid showing aggression clustered before lunch.'),
('Measurement C10-C12', 'Level', 1, 'Data hovering around 10 responses per session.'),
('Measurement C10-C12', 'Phase Change', 1, 'The line between baseline and intervention.'),
('Measurement C10-C12', 'Cumulative Record', 3, 'Total words learned rising steadily across weeks.'),
('Measurement C10-C12', 'Trend', 1, 'Data rising across five sessions.'),
('Measurement C10-C12', 'Standard Celeration Chart', 3, 'A chart where doubling from 5 to 10 looks the same as 50 to 100.'),
('Measurement C10-C12', 'Variability', 1, 'Data bouncing between 2 and 15 per session.'),
('Measurement C10-C12', 'Line Graph', 1, 'Session number on the x-axis, rate on the y-axis, points joined.'),
('Measurement C10-C12', 'Data Path', 2, 'The line joining baseline points.'),
('Measurement C10-C12', 'Treatment Fidelity', 2, 'Scoring whether each step of a protocol was delivered correctly.'),
('Experimental Design D1-D3', 'Testing', 2, 'Scores rise because the learner has taken the same test many times.'),
('Experimental Design D1-D3', 'Confounding Variable', 2, 'A new medication starting at the same time as the intervention.'),
('Experimental Design D1-D3', 'Attrition', 2, 'Half the participants dropping out before follow-up.'),
('Experimental Design D1-D3', 'Maturation', 2, 'A toddler''s language improving simply with age during a study.'),
('Experimental Design D1-D3', 'External Validity', 2, 'Whether an intervention that worked in a clinic also works at home.'),
('Experimental Design D1-D3', 'Internal Validity', 2, 'Ruling out that a new teacher explains the improvement.'),
('Experimental Design D1-D3', 'Experimental Control', 3, 'Behavior changes only when, and each time, the IV is applied.'),
('Experimental Design D1-D3', 'Dependent Variable', 1, 'The number of call-outs per class period.'),
('Experimental Design D1-D3', 'Independent Variable', 1, 'The token system a researcher introduces and removes.'),
('Experimental Design D1-D3', 'Functional Relation', 3, 'Problem behavior drops each time an intervention is introduced and rises each time it is withdrawn.'),
('Experimental Design D4-D5', 'Group Design', 1, 'Comparing average outcomes of 50 treated and 50 untreated children.'),
('Experimental Design D4-D5', 'Feasibility RCT', 2, 'Testing recruitment and retention before a full trial.'),
('Experimental Design D4-D5', 'Steady State Responding', 2, 'Baseline data showing little variability over five sessions.'),
('Experimental Design D4-D5', 'Prediction', 2, 'Assuming baseline levels would continue without intervention.'),
('Experimental Design D4-D5', 'Baseline', 1, 'Measuring tantrums for a week before starting treatment.'),
('Experimental Design D4-D5', 'Repeated Measurement', 1, 'Measuring on-task behavior every session across all phases.'),
('Experimental Design D4-D5', 'Waitlist-Control RCT', 3, 'The control group starts treatment once follow-up measures are taken.'),
('Experimental Design D4-D5', 'Randomized Controlled Trial', 1, 'Randomly assigning 100 children to treatment or control.'),
('Experimental Design D4-D5', 'Verification', 3, 'Withdrawing treatment and seeing behavior return to baseline levels.'),
('Experimental Design D4-D5', 'Crossover RCT', 3, 'Each participant gets both treatments in a random order.'),
('Experimental Design D4-D5', 'Cluster Randomized Controlled Trial', 3, 'Randomizing whole schools to intervention or control.'),
('Experimental Design D4-D5', 'Two-Arm RCT', 2, 'Comparing an intervention with treatment as usual.'),
('Experimental Design D4-D5', 'Single-Case Experimental Design', 2, 'Comparing one child''s behavior across baseline and intervention phases.'),
('Experimental Design D4-D5', 'Replication', 2, 'A researcher reintroduces an intervention after baseline to see whether the effect happens again.'),
('Experimental Design D5-D9', 'Trend', 1, 'Data rising across five sessions.'),
('Experimental Design D5-D9', 'Visual Analysis', 2, 'Checking level, trend and variability across baseline and intervention.'),
('Experimental Design D5-D9', 'Level', 1, 'Data hovering around 10 responses per session.'),
('Experimental Design D5-D9', 'Phase Change', 1, 'The line between baseline and intervention.'),
('Experimental Design D5-D9', 'Variability', 1, 'Data bouncing between 2 and 15 per session.'),
('Experimental Design D5-D9', 'Alternating Treatments', 2, 'Alternating two teaching methods across sessions and comparing data paths.'),
('Experimental Design D5-D9', 'Carryover Effect', 3, 'Effects of a medication persisting into the next condition.'),
('Experimental Design D5-D9', 'Changing-Criterion', 2, 'Raising the required minutes of exercise each week and seeing behavior follow.'),
('Experimental Design D5-D9', 'Component Analysis', 3, 'Testing a package with and without its token component.'),
('Experimental Design D5-D9', 'Social Validity', 2, 'Surveying parents about whether the improvements made a difference at home.'),
('Experimental Design D5-D9', 'Within-Subject Comparison', 2, 'Comparing one learner''s baseline and treatment data.'),
('Experimental Design D5-D9', 'Withdrawal', 2, 'Stopping the token system to see if behavior returns to baseline.'),
('Experimental Design D5-D9', 'Sequence Effect', 3, 'Results differing depending on which treatment came first.'),
('Experimental Design D5-D9', 'Parametric Analysis', 3, 'Comparing 5, 10 and 20 minutes of daily practice.'),
('Experimental Design D5-D9', 'Comparative Analysis', 2, 'Comparing video modeling with in-person modeling.'),
('Experimental Design D5-D9', 'Reversal Design', 2, 'A-B-A-B: baseline, treatment, baseline, treatment.'),
('Experimental Design D5-D9', 'Between-Subjects Comparison', 2, 'Comparing the treatment group''s mean with the control group''s.'),
('Experimental Design D5-D9', 'Multiple-Baseline', 2, 'Starting intervention for three students at different times.'),
('Assessment F2-F4', 'Curriculum-Based Assessment', 2, 'Testing which spelling-list words a student can already spell.'),
('Assessment F2-F4', 'Contextual Fit', 3, 'Choosing a plan the family can run with the time and resources they have.'),
('Assessment F2-F4', 'Single-Stimulus', 2, 'Offering one toy at a time and recording whether the child approaches it.'),
('Assessment F2-F4', 'Criterion-Referenced Assessment', 2, 'Checking whether a learner meets ''counts to 20 without errors''.'),
('Assessment F2-F4', 'Norm-Referenced Assessment', 2, 'A standardized test reporting a child''s score as a percentile for their age.'),
('Assessment F2-F4', 'Free-Operant', 2, 'Setting out several toys and recording time spent with each.'),
('Assessment F2-F4', 'Paired-Stimulus', 2, 'Presenting every pair of five snacks and recording which is picked.'),
('Assessment F2-F4', 'Preference Assessment', 1, 'Offering items to see which a child picks most often.'),
('Assessment F2-F4', 'Reinforcer Assessment', 2, 'Checking whether access to a preferred toy increases task completion.'),
('Assessment F2-F4', 'Multiple-Stimulus Without Replacement', 2, 'Presenting five toys, removing each one after it''s chosen, until none are left.'),
('Assessment F2-F4', 'Progressive Ratio Schedule', 3, 'FR 2, then FR 4, then FR 8 within a session until responding stops.'),
('Assessment F5-F6', 'Attention Condition', 2, 'The therapist gives brief attention only after problem behavior.'),
('Assessment F5-F6', 'Functional Behavior Assessment', 2, 'Interviews, observation and possibly an FA to find why a child hits.'),
('Assessment F5-F6', 'Conditional Probability', 3, 'Attention follows 70% of observed screams.'),
('Assessment F5-F6', 'Tangible Condition', 2, 'A preferred toy is returned only after problem behavior.'),
('Assessment F5-F6', 'Test Condition', 3, 'Any FA condition designed to evoke behavior for one function.'),
('Assessment F5-F6', 'Indirect Assessment', 1, 'A caregiver completing a functional interview.'),
('Assessment F5-F6', 'Alone Condition', 2, 'The client is observed with no one present and no materials.'),
('Assessment F5-F6', 'Functional Analysis', 2, 'Running attention, demand, alone and play conditions to identify function.'),
('Assessment F5-F6', 'Control Condition', 2, 'Play condition with free attention, toys and no demands.'),
('Assessment F5-F6', 'Synthesised Contingency', 3, 'Giving attention, toys and escape together after problem behavior.'),
('Assessment F5-F6', 'Descriptive Assessment', 2, 'Recording ABC data in the classroom for a week.'),
('Assessment F5-F6', 'ABC Recording', 1, 'Noting what happened before and after each tantrum.'),
('Assessment F5-F6', 'Demand Condition', 2, 'Tasks are removed briefly after problem behavior.'),
('Assessment F5-F6', 'Scatterplot', 2, 'A grid showing aggression clustered before lunch.'),
('Assessment F7-F8', 'Undifferentiated Responding', 3, 'Problem behavior equally high in every FA condition.'),
('Assessment F7-F8', 'Multiply Controlled Behavior', 3, 'Hitting that is elevated in both attention and demand conditions.'),
('Assessment F7-F8', 'Differentiated Responding', 3, 'Problem behavior high only in the demand condition.'),
('Assessment F7-F8', 'Habilitation', 3, 'Teaching skills that let an adult live more independently.'),
('Assessment F7-F8', 'Pivotal Behavior', 3, 'Teaching self-initiation leads to gains across many untrained skills.'),
('Assessment F7-F8', 'Social Significance', 3, 'Choosing independent toileting as a target because it increases a child''s access to school and community settings.'),
('Assessment F7-F8', 'Behavioral Cusp', 3, 'Learning to read opens access to books, signs and messages.'),
('Assessment F7-F8', 'Scope of Competence', 2, 'A BCBA with no training in organizational work declines a consultancy contract.'),
('Behavior Change G1-G3', 'Avoidance', 2, 'Leaving before a peer arrives to avoid teasing.'),
('Behavior Change G1-G3', 'Reinforcer', 1, 'The sticker that makes tidying more likely.'),
('Behavior Change G1-G3', 'Noncontingent Reinforcement', 2, 'Giving attention every 2 minutes regardless of behavior to reduce attention-seeking.'),
('Behavior Change G1-G3', 'DRO', 2, 'A token for every 5 minutes without hitting.'),
('Behavior Change G1-G3', 'Escape', 2, 'Leaving the table when a disliked task is presented.'),
('Behavior Change G1-G3', 'DRA', 2, 'Reinforcing ''break please'' instead of tantrums.'),
('Behavior Change G1-G3', 'DRH', 3, 'Reinforcing a student who answers at least 10 questions per lesson.'),
('Behavior Change G1-G3', 'Time-Based Reinforcement', 3, 'Any delivery of a stimulus by the clock rather than by behavior.'),
('Behavior Change G1-G3', 'DRI', 2, 'Reinforcing hands in pockets to reduce hand-mouthing.'),
('Behavior Change G1-G3', 'DRL', 3, 'Reinforcing a student who asks for help no more than 3 times per lesson.'),
('Behavior Change G1-G3', 'Contingency', 2, 'If homework is done, then screen time is available.'),
('Behavior Change G1-G3', 'Negative Reinforcement', 1, 'Putting on sunglasses removes glare.'),
('Behavior Change G1-G3', 'Differential Reinforcement', 2, 'Praising quiet hand-raising while ignoring call-outs.'),
('Behavior Change G1-G3', 'Fixed-Time Schedule', 2, 'Attention every 5 minutes regardless of behavior.'),
('Behavior Change G1-G3', 'Variable-Time Schedule', 2, 'Attention delivered on average every 5 minutes regardless of behavior.'),
('Behavior Change G1-G3', 'Positive Reinforcement', 1, 'A child gets a sticker for tidying and tidies more often.'),
('Behavior Change G4-G6', 'Backup Reinforcer', 2, 'Screen time bought with five tokens.'),
('Behavior Change G4-G6', 'Token Economy', 1, 'Students earn points for work and exchange them for privileges on Friday.'),
('Behavior Change G4-G6', 'Pairing', 2, 'Saying ''great job'' each time a child gets a favorite snack.'),
('Behavior Change G4-G6', 'Motivating Operation', 2, 'Being thirsty makes water valuable and asking for water more likely.'),
('Behavior Change G4-G6', 'Conditioned Reinforcer', 2, 'Praise that works because it has been paired with treats.'),
('Behavior Change G4-G6', 'Stimulus Control', 2, 'A child answers the phone only when it rings.'),
('Behavior Change G4-G6', 'Discriminative Stimulus', 1, 'An ''open'' sign on a shop.'),
('Behavior Change G4-G6', 'Matching-to-Sample', 2, 'Seeing the word ''cat'' and choosing the matching picture from three.'),
('Behavior Change G4-G6', 'Abolishing Operation', 2, 'Satiation on juice makes juice less valuable.'),
('Behavior Change G4-G6', 'Establishing Operation', 2, 'Food deprivation makes food more valuable.'),
('Behavior Change G4-G6', 'Simple Discrimination', 2, 'Saying ''dog'' only when a dog is present.'),
('Behavior Change G4-G6', 'Generalized Conditioned Reinforcer', 2, 'Money or tokens exchangeable for many backups.'),
('Behavior Change G4-G6', 'S-Delta', 2, 'A ''closed'' sign on a shop.'),
('Behavior Change G4-G6', 'Stimulus Discrimination', 2, 'Asking Mum for sweets but not Dad.'),
('Behavior Change G4-G6', 'Conditional Discrimination', 3, 'Picking the red card when told ''red'', the blue card when told ''blue''.'),
('Behavior Change G7-G11', 'Least-to-Most Prompting', 2, 'Waiting, then a gesture, then a model, then physical guidance if needed.'),
('Behavior Change G7-G11', 'Prompt Delay', 2, 'Waiting a few seconds after the instruction before prompting.'),
('Behavior Change G7-G11', 'Modeling', 1, 'Showing how to wave before asking the child to wave.'),
('Behavior Change G7-G11', 'Stimulus Prompt', 2, 'Placing the correct card closer to the learner.'),
('Behavior Change G7-G11', 'Prompt', 1, 'Pointing to the correct answer.'),
('Behavior Change G7-G11', 'Errorless Learning', 2, 'Starting with full prompts and fading so the learner is almost always correct.'),
('Behavior Change G7-G11', 'Terminal Behavior', 1, 'Saying ''water'' clearly, the target of a shaping program.'),
('Behavior Change G7-G11', 'Stimulus Fading', 3, 'Gradually shrinking a bold outline around the correct answer.'),
('Behavior Change G7-G11', 'Prompt Fading', 2, 'Moving from hand-over-hand guidance to a light touch to no touch.'),
('Behavior Change G7-G11', 'Constant Time Delay', 2, 'Always waiting 4 seconds before prompting.'),
('Behavior Change G7-G11', 'Rule', 2, '''If you finish your work, you can go outside.'''),
('Behavior Change G7-G11', 'Most-to-Least Prompting', 2, 'Starting with full physical guidance and fading to gestures.'),
('Behavior Change G7-G11', 'Successive Approximation', 2, 'Saying ''wa'' on the way to ''water''.'),
('Behavior Change G7-G11', 'Generalized Imitation', 3, 'A child copying a new dance move never reinforced before.'),
('Behavior Change G7-G11', 'Response Prompt', 2, 'A verbal cue, model or physical guidance.'),
('Behavior Change G7-G11', 'Progressive Time Delay', 2, 'Waiting 0, then 1, then 2 seconds before prompting across trials.'),
('Behavior Change G7-G11', 'Transfer of Stimulus Control', 3, 'A child who labeled ''cup'' after a model now labels it with just the question.'),
('Behavior Change G7-G11', 'Contingency-Shaped Behavior', 2, 'Learning to avoid a hot stove after touching it.'),
('Behavior Change G7-G11', 'Rule-Governed Behavior', 2, 'Wearing a seatbelt because you were told it prevents injury.'),
('Behavior Change G7-G11', 'Shaping', 2, 'Reinforcing ''b'', then ''ba'', then ''ball''.'),
('Behavior Change G12-G15', 'Interdependent Group Contingency', 2, 'The class earns a party if everyone completes their homework.'),
('Behavior Change G12-G15', 'Response Generalization', 3, 'After learning to say ''hi'', a child also starts saying ''hello''.'),
('Behavior Change G12-G15', 'Massed Trials', 2, 'Presenting ''touch red'' ten times in a row.'),
('Behavior Change G12-G15', 'Free-Operant Procedure', 2, 'A learner responding as often as they like during a 1-minute timing.'),
('Behavior Change G12-G15', 'Backward Chaining', 2, 'Teaching the last step of tying shoelaces first.'),
('Behavior Change G12-G15', 'Task Analysis', 1, 'Listing the 12 steps of brushing teeth.'),
('Behavior Change G12-G15', 'Discrete Trial', 1, '''Touch the cat'' → child touches → praise.'),
('Behavior Change G12-G15', 'General Case Analysis', 3, 'Teaching vending machine use on several machine types that span those in the community.'),
('Behavior Change G12-G15', 'Independent Group Contingency', 2, 'Each student who finishes their work earns a sticker.'),
('Behavior Change G12-G15', 'Forward Chaining', 2, 'Teaching the first step of making a sandwich first.'),
('Behavior Change G12-G15', 'Dependent Group Contingency', 2, 'The class gets extra recess if one student meets their goal.'),
('Behavior Change G12-G15', 'Total Task Presentation', 2, 'Guiding the learner through every step of handwashing each time.'),
('Behavior Change G12-G15', 'Programming Common Stimuli', 3, 'Using the classroom''s actual worksheets during one-to-one teaching.'),
('Behavior Change G12-G15', 'Generalization', 2, 'Behavior change spreading to new stimuli or new responses.'),
('Behavior Change G12-G15', 'Behavior Chain', 3, 'Each step of handwashing produces the cue for the next.'),
('Behavior Change G12-G15', 'Stimulus Generalization', 2, 'A child who learned ''dog'' with a terrier also says ''dog'' for a poodle.'),
('Behavior Change G16-G19', 'Response Cost', 2, 'Losing two tokens for swearing.'),
('Behavior Change G16-G19', 'Overcorrection', 3, 'Cleaning the whole table, not just the spilled juice, after throwing it.'),
('Behavior Change G16-G19', 'Time-Out', 2, 'Sitting out of a game for 2 minutes after hitting.'),
('Behavior Change G16-G19', 'Maintenance', 2, 'Still using a new communication skill three months after teaching ends.'),
('Behavior Change G16-G19', 'Negative Punishment', 1, 'Losing phone time after swearing.'),
('Behavior Change G16-G19', 'Transitivity', 2, 'After A→B and B→C training, choosing C given A.'),
('Behavior Change G16-G19', 'Reflexivity', 2, 'Matching a picture of a cat to an identical picture.'),
('Behavior Change G16-G19', 'Schedule Thinning', 2, 'Moving from FR 1 to FR 3 to FR 5 over weeks.'),
('Behavior Change G16-G19', 'Positive Punishment', 1, 'A reprimand after running in the hall reduces running.'),
('Behavior Change G16-G19', 'Symmetry', 2, 'After learning ''cat''→picture, choosing ''cat'' when shown the picture.'),
('Behavior Change G16-G19', 'Stimulus Equivalence', 3, 'After learning word→picture and picture→sign, matching word and sign in any direction.'),
('Behavior Change G16-G19', 'Extinction Burst', 2, 'Pressing a broken lift button repeatedly.'),
('Interventions H1-H2', 'Systematic Review', 2, 'A review that searches set databases with set criteria and appraises every eligible study.'),
('Interventions H1-H2', 'Mastery Criterion', 1, '90% correct across three consecutive sessions.'),
('Interventions H1-H2', 'Standardised Assessment', 2, 'A published test given with the same instructions and scoring for everyone.'),
('Interventions H1-H2', 'Least Restrictive Alternative', 2, 'Trying differential reinforcement before any punishment procedure.'),
('Interventions H1-H2', 'Assent', 2, 'A child happily coming to the session and engaging with materials.'),
('Interventions H1-H2', 'Nomothetic Assessment', 3, 'Using population norms to decide whether a score is typical.'),
('Interventions H1-H2', 'Idiographic Assessment', 3, 'Tracking one client''s own pattern of behavior across settings.'),
('Interventions H1-H2', 'Evidence-Based Practice', 2, 'Choosing an intervention by weighing research, experience and family preferences.'),
('Interventions H1-H2', 'Functional Behaviour Assessment', 2, 'Interviews, observation and possibly an FA to find why a child hits.'),
('Interventions H1-H2', 'Criterion-Referenced Assessment', 2, 'Checking whether a learner meets ''counts to 20 without errors''.'),
('Interventions H1-H2', 'Terminal Behaviour', 1, 'Saying ''water'' clearly, the target of a shaping program.'),
('Interventions H2-H3', 'Risk of Bias', 2, 'Rating a study''s likely bias across randomization, blinding and missing data.'),
('Interventions H2-H3', 'Publication Bias', 2, 'Null findings staying in file drawers, inflating a meta-analysis.'),
('Interventions H2-H3', 'Detection Bias', 3, 'Unblinded observers scoring the treatment group more favorably.'),
('Interventions H2-H3', 'Pre-registration', 2, 'Registering hypotheses and analysis plans on a public registry before starting.'),
('Interventions H2-H3', 'Meta-analysis', 2, 'Pooling effect sizes from 20 studies into one estimate.'),
('Interventions H2-H3', 'Efficacy', 2, 'An intervention working in a tightly controlled lab study.'),
('Interventions H2-H3', 'Selection Bias', 2, 'A treatment group that starts with higher skills than the control group.'),
('Interventions H2-H3', 'Replacement Behaviour', 1, 'Teaching ''break please'' in place of throwing materials.'),
('Interventions H2-H3', 'Performance Bias', 3, 'Therapists giving extra attention to the treatment group.'),
('Interventions H2-H3', 'Heterogeneity of effect', 3, 'Studies finding effects ranging from none to very large.'),
('Interventions H2-H3', 'Effectiveness', 2, 'An intervention still working when run by school staff.'),
('Interventions H2-H3', 'Functional Equivalence', 2, 'A request for a break and a tantrum both producing escape.'),
('Interventions H2-H3', 'Social Validity', 2, 'Surveying parents about whether the improvements made a difference at home.'),
('Interventions H4-H6', 'Renewal', 3, 'Problem behavior returning at home after being extinguished at the clinic.'),
('Interventions H4-H6', 'Reinstatement', 3, 'A parent gives in once, and extinguished whining returns.'),
('Interventions H4-H6', 'Relapse', 2, 'Any return of treated problem behavior.'),
('Interventions H4-H6', 'Treatment Drift', 2, 'Staff slowly shortening the required wait time in a protocol.'),
('Interventions H4-H6', 'Procedural Integrity', 2, 'Scoring 18 of 20 protocol steps correctly: 90% integrity.'),
('Interventions H4-H6', 'Iatrogenic Effect', 3, 'Extinction leading to new aggression during treatment.'),
('Interventions H4-H6', 'Behavioural Contrast', 3, 'Reduced reinforcement at school raises the behavior at home.'),
('Interventions H4-H6', 'Extinction Burst', 2, 'Pressing a broken lift button repeatedly.'),
('Interventions H4-H6', 'Spontaneous Recovery', 3, 'Crying returns briefly at the start of the next day''s session.'),
('Interventions H4-H6', 'Resurgence', 3, 'Hitting returns when requests for a break stop being honored.'),
('Interventions H6', 'Needs Assessment', 2, 'Asking staff what would make a protocol hard to run.'),
('Interventions H6', 'Component Integrity', 3, 'Recording which of 10 protocol steps were done correctly.'),
('Interventions H6', 'Error of Commission', 2, 'Giving attention during extinction when the plan says to ignore.'),
('Interventions H6', 'Opportunity-Based Integrity', 3, 'Praise delivered on 8 of 10 opportunities.'),
('Interventions H6', 'Engagement', 2, 'Parents completing the home-practice sheets each week.'),
('Interventions H6', 'Error of Omission', 2, 'Forgetting to deliver the token after a correct response.'),
('Interventions H6', 'Tailoring', 2, 'A clinician changes reinforcers to suit a teen''s interests.'),
('Interventions H6', 'Performance Feedback', 1, 'Telling a technician they ran 80% of steps correctly and what to fix.'),
('Interventions H6', 'Global Integrity', 2, '92% of steps correct across the whole session.'),
('Interventions H6', 'Response Effort', 2, 'Simplifying a data sheet so staff are more likely to fill it in.'),
('Interventions H6', 'Self-Tailoring', 2, 'A client choosing which of three relaxation strategies to use.'),
('Interventions H7-H8', 'Summative Evaluation', 2, 'Comparing pre- and post-intervention data at the end of a school year.'),
('Interventions H7-H8', 'Caregiver Training', 1, 'Coaching parents to run a bedtime routine protocol.'),
('Interventions H7-H8', 'Construct Validity', 3, 'Checking a ''social skills'' scale actually measures social skills.'),
('Interventions H7-H8', 'Content Validity', 3, 'A reading test that covers decoding, fluency and comprehension.'),
('Interventions H7-H8', 'Test-Retest Reliability', 2, 'The same test given two weeks apart gives similar scores.'),
('Interventions H7-H8', 'Formative Evaluation', 2, 'Reviewing weekly graphs and adjusting prompts as needed.'),
('Interventions H7-H8', 'Behavioural Skills Training', 1, 'Explaining, modeling, role-playing and giving feedback on a prompting procedure.'),
('Interventions H7-H8', 'Criterion Validity', 3, 'A screening tool predicting later diagnosis.');

-- Preserve existing reviewed examples. Fill support for the additional areas.
insert into public.adaptive_term_metadata as existing(term_id,difficulty,example_in_context)
select ct.term_id,e.difficulty,e.example from content_terms ct
join rollout_study_examples e on e.pack=ct.pack and e.term=ct.term
where ct.quiz_id in(select quiz_id from content_packs where coalesce(response_mode,'options')='options')
on conflict(term_id) do update set
 example_in_context=coalesce(nullif(trim(existing.example_in_context),''),excluded.example_in_context),
 difficulty=coalesce(existing.difficulty,excluded.difficulty),updated_at=now();
insert into public.adaptive_pack_settings(quiz_id,enabled,session_length,independent_option_cap,reduced_option_count,target_fraction)
select quiz_id,true,10,10,3,0.70 from content_packs where coalesce(response_mode,'options')='options'
on conflict(quiz_id) do update set enabled=true,session_length=10,independent_option_cap=10,
 reduced_option_count=3,target_fraction=0.70,updated_at=now();
insert into public.adaptive_pack_links(typed_quiz_id,options_quiz_id)
select t.quiz_id,o.quiz_id from content_packs t join content_packs o
 on lower(trim(t.title))=lower(trim(o.title)) and t.category=o.category
where t.response_mode='typed' and coalesce(o.response_mode,'options')='options'
on conflict(typed_quiz_id) do update set options_quiz_id=excluded.options_quiz_id;

select p.title,coalesce(p.response_mode,'options') response_mode,
 count(t.id) filter(where t.is_active) active_terms,
 count(t.id) filter(where not t.is_active) retired_terms
from content_packs p join public.quiz_term_bank t on t.quiz_id=p.quiz_id
group by p.title,p.response_mode order by p.title,p.response_mode;
commit;
