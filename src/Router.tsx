import {
  HashRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { SessionProvider, useSession } from "./SessionContext";
import { sessionPath } from "./navigation";
import App from "./App";
import InformationPage from "./pages/InformationPage";
import Completed from "./pages/Completed";
import Preparation from "./pages/Preparation";
import Birth from "./pages/Birth";
import Cord from "./pages/Cord";
import Initial from "./pages/Initial";
import Skin from "./pages/Skin";
import FirstActions from "./pages/FirstActions";
import Respiration from "./pages/Respiration";
import Distress from "./pages/Distress";
import DistressSupport from "./pages/DistressSupport";
import Ventilation from "./pages/Ventilation";
import HeartRate100 from "./pages/HeartRate100";
import Correctives from "./pages/Correctives";
import HeartRate60 from "./pages/HeartRate60";
import Compressions from "./pages/Compressions";
import AdvancedHeartRate from "./pages/AdvancedHeartRate";
import Medication from "./pages/Medication";
import RecoveryReview from "./pages/RecoveryReview";
import PostCare from "./pages/PostCare";
// Guard only validates access. It never chooses or renders a step component.
function SessionGuard() {
  const [session] = useSession();
  const location = useLocation();
  return location.pathname === sessionPath(session) ? (
    <Outlet key={session.startedAt} />
  ) : (
    <Navigate to={sessionPath(session)} replace />
  );
}
function Resume() {
  const [session] = useSession();
  return <Navigate to={sessionPath(session)} replace />;
}
export default function Application() {
  return (
    <HashRouter>
      <SessionProvider>
        <Routes>
          <Route path="/guida" element={<InformationPage guide />} />
          <Route path="/privacy" element={<InformationPage privacy />} />
          <Route path="/il-progetto" element={<InformationPage />} />
          <Route path="/note-legali" element={<InformationPage legal />} />
          <Route element={<App />}>
          <Route path="/" element={<Resume />} />
          <Route path="/procedura">
            <Route index element={<Resume />} />
            <Route element={<SessionGuard />}>
              <Route path="preparation" element={<Preparation />} />
              <Route path="birth" element={<Birth />} />
              <Route path="cord" element={<Cord />} />
              <Route path="initial" element={<Initial />} />
              <Route path="skin" element={<Skin />} />
              <Route path="first-actions" element={<FirstActions />} />
              <Route path="respiration" element={<Respiration />} />
              <Route path="distress" element={<Distress />} />
              <Route path="distress-support" element={<DistressSupport />} />
              <Route path="ppv" element={<Ventilation />} />
              <Route path="hr100" element={<HeartRate100 />} />
              <Route path="correctives" element={<Correctives />} />
              <Route path="hr60" element={<HeartRate60 />} />
              <Route path="compressions" element={<Compressions />} />
              <Route path="advanced-hr" element={<AdvancedHeartRate />} />
              <Route path="medication" element={<Medication />} />
              <Route path="recovery-review" element={<RecoveryReview />} />
              <Route path="post" element={<PostCare />} />
              <Route path="conclusa" element={<Completed />} />
            </Route>
          </Route>
          <Route path="*" element={<Resume />} />
          </Route>
        </Routes>
      </SessionProvider>
    </HashRouter>
  );
}
