-- Enable the remaining Concepts and Principles packs after existing adaptive migrations.
-- Adds study examples and settings; preserves definitions and learner records.
-- Validates the complete area before enabling anything. Safe to rerun.
begin;
create temporary table concepts_rollout_packs (
  quiz_id uuid primary key, title text not null, expected_terms integer not null
) on commit drop;
insert into concepts_rollout_packs values
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Principles: Contingencies 1', 17),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Principles: Contingencies 2', 19),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Principles: Derived Stimulus Relations', 15),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Principles: Motivating Operations', 12),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Principles: Punishment', 9),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Principles: Reinforcement', 19),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Principles: Respondent Conditioning', 13),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Principles: Schedules of Reinforcement 1', 11),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Principles: Schedules of Reinforcement 2', 12),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Principles: Stimulus Control', 19);
create temporary table concepts_rollout_examples (
  quiz_id uuid not null, term_text text not null, example text not null,
  primary key (quiz_id, term_text)
) on commit drop;
insert into concepts_rollout_examples values
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Empiricism', 'Accepting a new technique only after data show it works.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Determinism', 'Assuming that a sudden change in a pupil''s behavior has a cause that can be found.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Antecedent', 'A teacher holding up a picture just before a pupil names it.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Consequence', 'A vending machine dropping a drink after coins are inserted.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Behaviorism', 'Holding that behavior should be explained by its relation to the environment.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Applied Behavior Analysis', 'Researchers show experimentally that a prompting procedure improves safe street crossing.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Clicker Training', 'A trainer first pairs a click with food, then clicks and provides food for successively longer periods of a horse standing still.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Environment', 'The kitchen, the people in it and the smell of cooking during a child''s mealtime.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Conditional Probability', 'A student leaves their seat on 3 of every 4 occasions when a timer starts: 0.75.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Discriminated Operant', 'A teenager swears with friends but not in front of grandparents.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Contingency-Shaped Behavior', 'Learning how hard to press a sticky door by pushing it many times.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Differential Reinforcement', 'Giving attention when a child asks politely, but not when she demands.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Antecedent Stimulus Class', 'A fire alarm, a shout of ''fire'' and the smell of smoke all evoke leaving the building.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Behavioral Cusp', 'Learning to ride a bus lets an adult reach new jobs, shops and friends.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Contingency', 'Food is delivered only following a lever press. Changing whether presses produce food changes the rat''s pressing.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Contingent', 'Free time given only after a worksheet is finished.'),
('d0364af6-d619-4f73-b2d3-2521b5e5a6ba'::uuid, 'Behavior', 'A dog wagging its tail.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Parsimony', 'Checking a pupil''s glasses prescription before looking for other reasons for poor reading.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Explanatory Fiction', '''He''s disruptive because he''s naughty'', where naughtiness is inferred from the disruption.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Radical Behaviorism', 'Treating a client''s worrying thoughts as behavior shaped by their history.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Pragmatism', 'Keeping a theory because it reliably helps change behavior.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Selectionism', 'Birds with beaks suited to local seeds survive and breed more often.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Methodological Behaviorism', 'A researcher records only what participants do and say, ignoring reported feelings.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Mentalism', 'Explaining a pupil''s refusal by ''low willpower''.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Philosophic Doubt', 'A clinician regularly re-examines whether a favored intervention still has good evidence.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Three-Term Contingency', 'When a shop''s OPEN sign is lit, entering produces access to goods. Entering when it is off does not. The customer increasingly enters when OPEN is lit.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Phylogeny', 'Humans'' startle response to sudden loud sounds, inherited through natural selection.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Ontogeny', 'A child learning to tie shoelaces through their own practice and feedback.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Operant Conditioning', 'Being thanked for holding a door makes holding doors more likely.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Topography', 'Waving with an open hand versus waving with two fingers.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Stimulus', 'The smell of smoke reaching someone in a room.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Function-Based Definition', 'Defining ''calling for help'' as any response that brings a staff member to the room.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Satiation', 'After an hour of music, a teenager no longer works to earn more listening time.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Response', 'One tap on a tablet screen.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Functionally Equivalent', 'Pointing to a cup and saying ''drink'' both get a child a drink.'),
('5c891c1d-ab83-48ff-8360-5c66c019454c'::uuid, 'Operant Behavior', 'Checking a phone because checking has often produced messages.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Stimulus Equivalence', 'After A-to-B and B-to-C matching is taught, a learner demonstrates untrained identity matches, reversed matches, and matches between A and C in both directions.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Class Expansion', 'Teaching a Spanish word for ''cat'' so it joins an existing class of the English word, picture and sign.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Naming', 'After hearing ''kiwi'' while seeing the fruit, a child can both point to it and name it.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Nonequivalence Relations', 'After learning A is bigger than B and B is bigger than C, a learner derives C is smaller than A without being taught that relation.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Symmetry', 'After learning the word ''bird'' goes with a picture of a bird, choosing the word when shown the picture.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Transitivity', 'After learning a word goes with a picture and the picture with a sign, choosing the sign given the word.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Contextual Control', 'A ''same'' cue makes the matching picture correct, while an ''opposite'' cue makes the contrasting one correct.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Arbitrary Relations', 'The written number ''3'' and the spoken word ''three''.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Arbitrarily Applicable Relational Responding', 'Treating a small paper note as worth more than a large coin.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Combined Symmetry and Transitivity', 'After learning word→picture and picture→sign, choosing the word when given the sign.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Nodal Stimulus', 'In training a picture with a word and the same picture with a sign, the picture is the node.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Reflexivity', 'Matching a photo of a key to an identical photo of the same key.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Mutual Entailment', 'Learning ''X is heavier than Y'' and deriving ''Y is lighter than X''.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Combinatorial Entailment', 'If X is older than Y and Y is older than Z, then X is older than Z.'),
('39891dae-f7c2-4493-bbb9-0c8f35869461'::uuid, 'Distinction Relation', '''A hammer is not a spanner.'''),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Establishing Operation (EO)', 'A long walk on a hot day makes water especially valuable.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Transitive CMO (CMO-T)', 'Being handed a locked box makes the key valuable.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Conditioned MO (CMO)', 'Seeing a parking meter makes coins valuable.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Surrogate CMO (CMO-S)', 'A previously neutral cue is repeatedly paired with food deprivation. Later, the cue alone increases the reinforcing value of food and evokes food-seeking responses.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Motivating Operation (MO)', 'Missing lunch makes food more valuable and makes food-getting behavior more likely.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Evocative Effect', 'Being cold makes someone ask for a blanket more often.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Unconditioned MO (UMO)', 'Being too warm makes cool air valuable.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Value-Altering Effect', 'Salty snacks making drinks more valuable.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Behavior-Altering Effect', 'Salty snacks making someone go to the fridge for a drink more often.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Abative Effect', 'After drinking plenty of water, a learner asks for water less often than before drinking.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Reflexive CMO (CMO-R)', 'A warning signal has reliably preceded a difficult task. Its onset makes removal of the signal reinforcing and evokes the response that has removed it.'),
('c7921958-c24e-49d0-8cbf-bee554dc0703'::uuid, 'Abolishing Operation (AO)', 'After an all-you-can-eat buffet, dessert is less valuable.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Conditioned Punisher', 'A parent''s frown that reduces misbehavior after being paired with losing privileges.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Bonus Response Cost', 'A learner receives five bonus tokens at the start of a lesson. One is removed after each rule violation, and violations decrease.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Negative Punishment', 'A teenager loses gaming time for staying out late and stays out late less often.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Automatic Punishment', 'Biting one''s tongue while eating quickly, and eating more slowly afterwards.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Punisher', 'A parking fine follows parking on a double yellow line, and that driver''s parking on double yellow lines subsequently decreases.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Punishment', 'Any consequence that makes a behavior less likely.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Positive Punishment', 'Touching an electric fence gives a jolt, and touching it becomes less likely.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Recovery from Punishment', 'A driver speeds again on a road once its speed camera is removed.'),
('aea63e4f-8608-4a00-bff3-9a5ded7a8eac'::uuid, 'Unconditioned Punisher', 'The first contact with a nettle produces a painful sting, and touching nettles subsequently decreases without previous conditioning of the sting.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Avoidance Contingency', 'Paying a bill before the due date so a late fee is never charged.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Generalized Conditioned Reinforcer', 'Points on a classroom card that can be traded for games, snacks or free time.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Discriminated Avoidance', 'Stepping back from the platform edge when the station announces an approaching train.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Unconditioned Negative Reinforcer', 'Moving into shade reduces painfully bright light. That reduction strengthens moving into shade without the light first needing to be paired with another aversive event.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Resurgence', 'A child''s old tantrums return once pointing to a picture card no longer gets the snack.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Automatic Reinforcement', 'A person repeatedly hums when alone because the sound produced by humming maintains the behavior; nobody delivers a consequence.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Negative Reinforcement', 'Opening a window stops a stuffy smell, and window-opening becomes more likely.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Spontaneous Recovery', 'A dog that stopped begging at the table begs again briefly at the next evening meal.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Conditioned Negative Reinforcer', 'Turning off a ringtone that has been linked to stressful work calls.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Extinction-Induced Variability', 'When a jammed drawer won''t open with a pull, a person tries wiggling, lifting and pushing it.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Conditioned Reinforcer', 'A ''well done'' sticker that works because it has been traded for treats before.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Aversive Stimulus', 'A screeching smoke detector that people hurry to switch off.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Positive Reinforcement', 'A worker gets a thank-you email for finishing early and finishes early more often.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Extinction Burst', 'Repeatedly tapping a frozen phone screen harder and faster.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Reinforcement', 'A token follows pressing a button, and button pressing subsequently becomes more frequent.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Unconditioned Reinforcer', 'Warmth for someone who is cold.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Extinction', 'A parent stops giving in to demands for sweets at the checkout.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Automaticity of Reinforcement', 'A participant chooses one task more often after it produces more points, although they cannot describe the difference in the point schedules.'),
('a73ddb7e-618b-4887-a86e-a951b0acb3b2'::uuid, 'Escape Contingency', 'Putting on headphones to stop hearing a neighbor''s drilling.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Higher-Order Conditioning (secondary conditioning)', 'A logo repeatedly shown with a jingle that already elicits excitement comes to elicit excitement itself.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Reflex', 'A tap below the kneecap and the leg kick it produces.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Habituation', 'No longer startling at a neighbor''s barking dog after a week of hearing it.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Conditioned Stimulus (CS)', 'The sound of a dentist''s drill eliciting tension after past painful treatment.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Stimulus Blocking', 'After a buzzer reliably predicts a puff of air, adding a light alongside the buzzer produces little blinking to the light alone.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Respondent Extinction', 'A tone previously paired with an air puff elicits blinking. Repeated presentations of the tone without an air puff gradually reduce blinking to the tone.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Respondent Conditioning', 'A tone is repeatedly followed by food. Food initially elicits salivation; after pairing, the tone also elicits salivation.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Respondent Behavior', 'Sneezing when pepper reaches the nose.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Unconditioned Reflex', 'Bright light causing the pupils to narrow.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Unconditioned Stimulus (US)', 'A loud bang eliciting a startle.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Conditioned Reflex', 'After repeated tone-food pairings, the tone elicits salivation. The learned tone-salivation relation is the conditioned reflex.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Neutral Stimulus (NS)', 'A chime heard for the first time, before it has been paired with anything.'),
('c09681df-6938-40d2-acc0-a4a2c7ded170'::uuid, 'Overshadowing', 'When a loud tone and a dim light together predict a puff of air, the tone alone later elicits blinking but the light alone barely does.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Fixed Interval (FI)', 'After food delivery, the first lever press after 30 seconds produces food. Presses before the 30 seconds have elapsed do not.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Behavioral Contrast', 'When a child''s joking is no longer laughed at in class, joking at the lunch table, where it is still laughed at, increases.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Conjunctive Schedule', 'A worker is paid a bonus only after both 20 calls are logged and 2 hours have passed.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Intermittent Schedule of Reinforcement', 'A fishing trip where only some casts catch a fish.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Fixed Ratio (FR)', 'A coffee card gives a free drink after every 8 purchases.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Behavior Chain', 'Making tea: filling the kettle leads to boiling water, which signals pouring, which leads to steeping.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Lag Reinforcement Schedule', 'Praising a child''s drawing only if it uses a color not used in the last three drawings.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Continuous Reinforcement (CRF)', 'A light that switches on every time the switch is pressed.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Concurrent Schedule', 'Two levers are available together. One earns food on an FR 10 schedule; the other earns food on a VI 30-second schedule.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Fixed-Time Schedule (FT)', 'A teacher gives each pupil a brief check-in every 10 minutes whatever they''re doing.'),
('baba7b0f-8c17-4b94-b9cf-6846040debc3'::uuid, 'Chained Schedule', 'Completing 10 lever presses turns on a green light; then the first press after 30 seconds produces food.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Multiple Schedule', 'A parent praises homework on an FR 3 when the kitchen timer is on and on an FI 5 minutes when it''s off.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Variable Ratio (VR)', 'A salesperson makes a sale after an unpredictable number of calls, on average every 10.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Mixed Schedule', 'A machine sometimes pays after 5 presses and sometimes after 1 minute, with nothing to show which rule applies.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Tandem Schedule', 'Five lever presses must occur, then the first press after two minutes produces food. No stimulus change signals the transition between those requirements.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Variable Interval (VI)', 'The first lever press after each interval produces food. The intervals vary from delivery to delivery, averaging 30 seconds.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Variable-Time Schedule (VT)', 'A nurse visits a patient at unpredictable times averaging every 20 minutes, whatever the patient is doing.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Progressive-Ratio Schedule', 'A child earns a toy after 2 puzzles, then after 4, then 8, until they stop working.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Postreinforcement Pause', 'A rat pauses after receiving food for its twentieth lever press, then resumes pressing toward the next FR 20 requirement.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Ratio Strain', 'A worker stops producing when the target for a bonus jumps from 10 to 50 items.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Schedule Thinning', 'Praise moves from every correct answer to every second, then every fourth, over several weeks.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Limited Hold', 'On an FI 30-second schedule, food is available only if a lever press occurs within five seconds after the interval ends.'),
('4bdf5f78-f28e-4c48-8c83-0dadb7da7138'::uuid, 'Schedule of Reinforcement', 'Deciding that a learner earns a token after every three correct answers.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Exclusion Training', 'A child who knows ''cup'' and ''spoon'' hears ''whisk'' and picks the unfamiliar utensil.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Shaping', 'Reinforcing a child for sitting at the table for 10 seconds, then 30, then a whole meal.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Simple Discrimination', 'A dog sits only when its owner says ''sit''.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Matching-to-Sample', 'A learner hears ''triangle'' and picks the triangle from a circle, a square and a triangle.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Discriminative Stimulus for Punishment (SDp)', 'Drivers slow down when they see a police car, where speeding has been ticketed before.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Stimulus Control', 'A pupil starts writing only when the teacher says ''begin''.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Arbitrary Stimulus Class', 'The spoken word ''stop'', a red octagon and a raised palm all evoke stopping.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Stimulus Class', 'All the stimuli that evoke ''vehicle'', from cars to buses.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Generalization Gradient', 'A plot showing a dog responds strongly to the trained whistle pitch and less to pitches further away.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Concept Formation', 'A learner selects unfamiliar triangles despite changes in size, color and orientation, and rejects unfamiliar circles and squares.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Stimulus Delta (S∆)', 'A grey ''unavailable'' button that never responds when tapped.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Discriminative Stimulus (SD)', 'Lever presses have produced food when a green light is on, but not when it is off. The green light now evokes pressing.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Stimulus Discrimination', 'A cat comes to the kitchen at the sound of the food tin opening but not other tins.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Feature Stimulus Class', 'All circular objects, whatever their size or color.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Imitation', 'A toddler stacks blocks right after watching a parent stack them.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Conditional Discrimination', 'Choosing the apple picture when asked for ''fruit'' and the carrot picture when asked for ''vegetable''.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Response Class', 'Knocking, ringing the bell and calling out all get someone to open the door.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Generalization', 'Skills taught in one setting also appearing in new settings or in new forms.'),
('6543b15c-90af-41c7-bde9-8a13d78ac51f'::uuid, 'Stimulus Generalization', 'After pressing is reinforced during a 1,000-Hz tone, a rat also presses to similar 900-Hz and 1,100-Hz tones without separate training.');

do $$
declare p record; e record; v_count integer;
begin
  for p in select * from concepts_rollout_packs loop
    if not exists (select 1 from public.quizzes q where q.id = p.quiz_id
      and q.title = p.title and q.is_listed and q.quiz_mode = 'banked'
      and coalesce(q.response_mode, 'options') = 'options') then
      raise exception 'Listed options pack does not match: %', p.title;
    end if;
    select count(*) into v_count from public.quiz_term_bank where quiz_id = p.quiz_id;
    if v_count <> p.expected_terms then
      raise exception '%: expected % terms, found %. Nothing was enabled.', p.title, p.expected_terms, v_count;
    end if;
    if exists (select 1 from public.quiz_term_bank t where t.quiz_id = p.quiz_id
      and (select count(*) from public.questions q where q.quiz_id = p.quiz_id
        and q.correct_term_id = t.id and nullif(trim(q.question_text), '') is not null) <> 1) then
      raise exception '%: each term needs exactly one nonempty linked definition. Nothing was enabled.', p.title;
    end if;
  end loop;
  for e in select * from concepts_rollout_examples loop
    select count(*) into v_count from public.quiz_term_bank t where t.quiz_id = e.quiz_id
      and lower(trim(t.term_text)) = lower(trim(e.term_text));
    if v_count <> 1 then
      raise exception 'Example term did not match uniquely: % (pack %). Nothing was enabled.', e.term_text, e.quiz_id;
    end if;
  end loop;
end $$;

insert into public.adaptive_term_metadata (term_id, example_in_context)
select t.id, e.example from concepts_rollout_examples e
join public.quiz_term_bank t on t.quiz_id = e.quiz_id
  and lower(trim(t.term_text)) = lower(trim(e.term_text))
on conflict (term_id) do update
  set example_in_context = excluded.example_in_context, updated_at = now();

insert into public.adaptive_pack_settings
  (quiz_id, enabled, session_length, independent_option_cap, reduced_option_count, target_fraction)
select quiz_id, true, 10, 10, 3, 0.70 from concepts_rollout_packs
on conflict (quiz_id) do update set enabled = true, session_length = 10,
  independent_option_cap = 10, reduced_option_count = 3, target_fraction = 0.70, updated_at = now();

select p.title, s.enabled, s.session_length, p.expected_terms as terms,
  count(m.term_id) filter (where nullif(trim(m.example_in_context), '') is not null) as study_examples
from concepts_rollout_packs p
join public.adaptive_pack_settings s on s.quiz_id = p.quiz_id
join public.quiz_term_bank t on t.quiz_id = p.quiz_id
left join public.adaptive_term_metadata m on m.term_id = t.id
group by p.title, s.enabled, s.session_length, p.expected_terms order by p.title;
commit;
