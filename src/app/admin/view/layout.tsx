// Layout-passthrough. A proteção fica em (protected)/layout.tsx,
// permitindo que /admin/view/login renderize sem checagem de cookie.
export default function AdminViewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
