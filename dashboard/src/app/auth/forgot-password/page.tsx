"use client";

export default function ForgotPasswordPage() {
  return (
    <div style={{ padding: 20, maxWidth: 520 }}>
      <h2>Forgot Password</h2>
      <p style={{ marginTop: 8 }}>
        Password reset by email/OTP is disabled in this simplified deployment.
      </p>
      <p style={{ marginTop: 8 }}>
        Ask an admin/owner to set your password from the Users page, or login and use the password change form in Profile.
      </p>
      <div style={{ marginTop: 12 }}>
        <a href="/auth/login">Back to login</a>
      </div>
    </div>
  );
}
