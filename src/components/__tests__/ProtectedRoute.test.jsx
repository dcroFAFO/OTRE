import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { vi } from "vitest";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/lib/AuthContext";

vi.mock("@/lib/AuthContext", () => ({ useAuth: vi.fn() }));

function renderRoute(auth, entry = "/portal?tab=jobs") {
  useAuth.mockReturnValue({ checkUserAuth: vi.fn(), ...auth });
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/portal" element={<p>Portal content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

function LoginProbe() {
  const location = useLocation();
  return <p>Login screen {location.search}</p>;
}

describe("ProtectedRoute", () => {
  it("preserves the requested path in the sign-in return URL", () => {
    renderRoute({ isAuthenticated: false, isLoadingAuth: false, authChecked: true, authError: null });
    expect(screen.getByText(/Login screen/)).toHaveTextContent("next=%2Fportal%3Ftab%3Djobs");
  });

  it("renders protected content for an authenticated account", () => {
    renderRoute({ isAuthenticated: true, isLoadingAuth: false, authChecked: true, authError: null });
    expect(screen.getByText("Portal content")).toBeVisible();
  });
});
