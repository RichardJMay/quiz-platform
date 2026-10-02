# Finalised content and practice questions

This update imports the **Items** sheet of `rephrased_versions.xlsx`: 446 terms in 33 packs. The original definition, rephrased definition and contextual question are imported exactly as supplied. The README's older total of 453 is not used. The workbook's 55 “Needs review” flags are treated as editorial notes, in accordance with the instruction to use this version as final.

Seven term occurrences are retired from both options and matching typed packs: Parallel-Group RCT; Normative Assessment; Adherence; Competence (two packs); Therapeutic Drift (two packs). “Normative Assessment” is the removal shown by the spreadsheet comparison, although the request called it “Nomothetic Assessment.” Term IDs, question IDs, previous attempts and responses are retained.

## Apply and check locally

Place the patch in the BehaviorLingo project root, then run:

```bash
git apply --check BehaviorLingo-finalised-definitions-and-context-practice.patch
git apply BehaviorLingo-finalised-definitions-and-context-practice.patch
npm run build
```

Open and run these files in Supabase's SQL Editor, **in this order**, each as one complete query:

1. `supabase/migrations/20261001_finalised_content_and_definition_variants.sql`
2. `supabase/migrations/20261001_context_practice.sql`

The first query validates pack/category names and term matches before updating content. If a match fails, stop and inspect the error rather than relaxing the safeguards. Its result lists active and retired term counts for each options and typed pack. Active options terms should total **446** across **33 packs**. Both queries are designed to be rerunnable.

These queries change the shared Supabase database immediately, including content and adaptive activation used by the deployed site. The new UI appears once the code is deployed. The rephrasing and contextual questions are additional columns on the existing question rows, so older quiz code does not inadvertently load duplicate items.

Run `npm run dev`, then test:

- An unpractised pack outside Concepts and Principles starts a baseline with every active term once, without feedback or disappearing options.
- Across baseline/accuracy trials, both wordings appear. Resume and help keep the current trial's wording stable. The wordings share term readiness, with no separate mastery rule.
- Short learning sets and both help levels work in the newly enabled areas. Typed fluency remains gated by receptive options accuracy.
- Retired terms do not appear in current options or typed practice. Old completed records remain available.
- Practice questions stay locked before the options fluency aim, including when accessing `/quiz?id=PACK_ID&stage=context` directly.
- A first daily options timing at 100% accuracy and at least 15 correct/min unlocks practice questions. Typed fluency is optional. The unlock is permanent.
- A contextual run is timed, correctly selected terms leave the option bank, and the result appears in the pack's separate practice-question record on Progress. Context results do not enter definition fluency graphs or models.
- The home page's Continue practice button returns to a recently completed contextual run.

## Records and teaching rules

Both wordings use the same original term and question IDs. Adaptive plans store the displayed wording and variant when the trial is created. A term still needs independent correct responses in two distinct completed sessions, with the latest independent response correct. Help does not supply independent evidence. No requirement to separately master each wording is added.

All 33 options packs are enabled for adaptive teaching. Existing study examples are preserved; missing examples are filled from the earlier term metadata workbook. Teaching sets contain up to ten terms with up to ten standard options, with the target/review proportion adjusted to the actual set size in smaller packs. Nearest-neighbour selection remains deferred.

Context responses and timings have separate tables and account-owned read policies. Access and saves are checked by authenticated database functions. A completed timing is saved only when all of its item responses have been recorded. Context rate has no new mastery aim: scenario reading is a different task from definition retrieval.

The migration saves previous term and question rows in `content_revision_backup` before updating them. Undoing a code patch does not itself restore database content. The source spreadsheet is unchanged.

## Verification supplied with the patch

Ten pure helper tests passed, including shared identity, both wordings, source preservation, and the unchanged two-session/help rules. Generated content was compared with all 446 source rows. The incremental patch was checked against the previous delivered source snapshot. A full Next.js build, live Supabase execution and browser/account checks need to be completed in the local project and database.
