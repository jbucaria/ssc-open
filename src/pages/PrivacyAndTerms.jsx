import { ThemedView } from '@/components/ThemedComponents'
import Footer from '@/components/Footer'
import logo from '@/assets/logo1.png'

const PrivacyAndTerms = () => {
  return (
    <ThemedView styleType="default" className="min-h-screen w-screen">
      <div className="flex justify-center my-4">
        <img
          src={logo}
          alt="Good Shepard Studios Logo"
          className="w-40 h-40 mx-auto mb-4"
        />
      </div>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-4">
          Good Shepard Studios - Privacy Policy and Terms of Service
        </h1>
        <p className="mb-6">
          <strong>Effective Date:</strong> February 28, 2025
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Privacy Policy</h2>
          <p className="mb-4">
            At Good Shepard Studios (&quot;we&quot;, &quot;our&quot;,
            &quot;us&quot;), your privacy is our priority. This Privacy Policy
            outlines how we collect, use, and safeguard your data when you use
            our application.
          </p>

          <h3 className="text-xl font-medium mb-2">Information We Collect</h3>
          <ul className="list-disc pl-5 mb-4">
            <li>
              <strong>Personal Information:</strong> Data such as your name,
              email address, and other details you voluntarily provide.
            </li>
            <li>
              <strong>Usage Data:</strong> Automatically collected data
              including IP addresses, browser details, and usage patterns.
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-2">
            How We Use Your Information
          </h3>
          <ul className="list-disc pl-5 mb-4">
            <li>To deliver and improve our services.</li>
            <li>To communicate updates, features, or important notices.</li>
            <li>To analyze trends and enhance your user experience.</li>
          </ul>

          <h3 className="text-xl font-medium mb-2">Data Security</h3>
          <p className="mb-4">
            We implement industry-standard security measures to protect your
            data. However, please note that no method of data transmission over
            the Internet is completely secure.
          </p>

          <h3 className="text-xl font-medium mb-2">
            Changes to Our Privacy Policy
          </h3>
          <p className="mb-4">
            We may update this policy periodically. Any changes will be posted
            here along with the updated effective date.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-2">Terms of Service</h2>
          <p className="mb-4">
            By accessing our application, you agree to abide by these Terms of
            Service. If you do not agree, please refrain from using our
            services.
          </p>

          <h3 className="text-xl font-medium mb-2">License and Use</h3>
          <p className="mb-4">
            Good Shepard Studios grants you a non-exclusive, non-transferable
            license to use our application for personal or internal business
            purposes.
          </p>

          <h3 className="text-xl font-medium mb-2">User Responsibilities</h3>
          <ul className="list-disc pl-5 mb-4">
            <li>Maintain the confidentiality of your login credentials.</li>
            <li>Use the application in accordance with all applicable laws.</li>
            <li>
              Refrain from activities that may harm or disrupt the service.
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-2">Disclaimer of Warranties</h3>
          <p className="mb-4">
            The application is provided &quot;as is&quot; without any
            warranties, express or implied. We do not guarantee uninterrupted or
            error-free service.
          </p>

          <h3 className="text-xl font-medium mb-2">Limitation of Liability</h3>
          <p className="mb-4">
            To the fullest extent permitted by law, Good Shepard Studios shall
            not be liable for any indirect, incidental, or consequential damages
            arising from your use of the application.
          </p>

          <h3 className="text-xl font-medium mb-2">
            Modifications and Termination
          </h3>
          <p className="mb-4">
            We reserve the right to modify these terms at any time. Continued
            use of our application constitutes acceptance of any changes. We may
            suspend or terminate access if these terms are violated.
          </p>

          <h3 className="text-xl font-medium mb-2">Governing Law</h3>
          <p className="mb-4">
            These terms are governed by the laws of [Your Jurisdiction]. Please
            replace this placeholder with the appropriate legal jurisdiction.
          </p>

          <h3 className="text-xl font-medium mb-2">Contact Information</h3>
          <p className="mb-4">
            If you have any questions regarding these terms, please contact us
            at{' '}
            <a
              href="mailto:your-email@example.com"
              className="text-blue-500 hover:underline"
            >
              jbucaria1@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
      <Footer />
    </ThemedView>
  )
}

export default PrivacyAndTerms
