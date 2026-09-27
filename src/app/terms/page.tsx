import LegalLayout from '@/components/layout/LegalLayout'

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Use" label="Using the site">
      <p>BehaviorLingo is operated personally by Dr Richard May. The service provides behaviour analysis study practice and is intended for adults aged 18 or over.</p>
      <section>
        <h2 className="text-xl font-semibold mb-2">Your account</h2>
        <p>Provide an email address you control, keep your sign-in details secure, and do not share your account. Contact us if you suspect someone else has accessed it.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Using the service</h2>
        <p>Use BehaviorLingo for lawful personal study. Do not interfere with the service, other learners’ accounts or data. Practice scores and estimates are study feedback; they do not guarantee exam results or professional certification.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Changes and availability</h2>
        <p>We may improve or change study features. If a change materially affects your account or access, we will give appropriate notice. You can stop using the service and request account deletion at any time.</p>
      </section>
      <section>
        <h2 className="text-xl font-semibold mb-2">Privacy and contact</h2>
        <p>See the <a href="/privacy" className="underline">Privacy Notice</a> for how your information is used. Questions can be sent to <a className="underline" href="mailto:richard.may@southwales.ac.uk">richard.may@southwales.ac.uk</a>.</p>
      </section>
    </LegalLayout>
  )
}
