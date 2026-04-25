import { Routes, Route } from "react-router-dom";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import AppLayout from "@/pages/app/AppLayout";
import RoleRedirect from "@/components/app/RoleRedirect";
import RequireRole from "@/components/app/RequireRole";
import AdminLayout from "@/pages/app/admin/AdminLayout";
import AdminDashboard from "@/pages/app/admin/AdminDashboard";
import Team from "@/pages/app/admin/team/Team";
import FormatsList from "@/pages/app/admin/formats/FormatsList";
import IdeasInbox from "@/pages/app/admin/ideas/IdeasInbox";
import NewIdea from "@/pages/app/admin/ideas/NewIdea";
import ScriptEditor from "@/pages/app/admin/ideas/ScriptEditor";
import VideosList from "@/pages/app/admin/videos/VideosList";
import NewVideo from "@/pages/app/admin/videos/NewVideo";
import VideoDetail from "@/pages/app/admin/videos/VideoDetail";
import EditorLayout from "@/pages/app/editor/EditorLayout";
import EditorDashboard from "@/pages/app/editor/EditorDashboard";
import AdvisorLayout from "@/pages/app/advisor/AdvisorLayout";
import AdvisorDashboard from "@/pages/app/advisor/AdvisorDashboard";
import RecursosList from "@/pages/recursos/RecursosList";
import RecursoDetail from "@/pages/recursos/RecursoDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route path="/recursos" element={<RecursosList />} />
      <Route path="/recursos/:slug" element={<RecursoDetail />} />

      <Route path="/app" element={<AppLayout />}>
        <Route index element={<RoleRedirect />} />

        <Route path="admin" element={<RequireRole role="admin" />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="ideas" element={<IdeasInbox />} />
            <Route path="ideas/new" element={<NewIdea />} />
            <Route path="ideas/:id" element={<ScriptEditor />} />
            <Route path="formats" element={<FormatsList />} />
            <Route path="videos" element={<VideosList />} />
            <Route path="videos/new" element={<NewVideo />} />
            <Route path="videos/:id" element={<VideoDetail />} />
            <Route path="team" element={<Team />} />
          </Route>
        </Route>

        <Route path="editor" element={<RequireRole role="editor" />}>
          <Route element={<EditorLayout />}>
            <Route index element={<EditorDashboard />} />
          </Route>
        </Route>

        <Route path="advisor" element={<RequireRole role="advisor" />}>
          <Route element={<AdvisorLayout />}>
            <Route index element={<AdvisorDashboard />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
