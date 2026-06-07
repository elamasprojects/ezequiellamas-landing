import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import LoadingScreen from "@/components/app/LoadingScreen";
import ErrorBoundary from "@/components/app/ErrorBoundary";

// Public — eager (small)
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";

// App shell — eager
import AppLayout from "@/pages/app/AppLayout";
import RoleRedirect from "@/components/app/RoleRedirect";
import RequireRole from "@/components/app/RequireRole";

// Layouts — eager
import AdminLayout from "@/pages/app/admin/AdminLayout";
import EditorLayout from "@/pages/app/editor/EditorLayout";
import AdvisorLayout from "@/pages/app/advisor/AdvisorLayout";

// Public placeholder pages — eager
import RecursosList from "@/pages/recursos/RecursosList";
import RecursoDetail from "@/pages/recursos/RecursoDetail";

// Lazy-loaded pages
const AdminDashboard = lazy(() => import("@/pages/app/admin/AdminDashboard"));
const Team = lazy(() => import("@/pages/app/admin/team/Team"));
const SettingsPage = lazy(() => import("@/pages/app/admin/settings/SettingsPage"));
const CrearPage = lazy(() => import("@/pages/app/admin/crear/CrearPage"));
const FormatsList = lazy(() => import("@/pages/app/admin/formats/FormatsList"));
const IdeasInbox = lazy(() => import("@/pages/app/admin/ideas/IdeasInbox"));
const NewIdea = lazy(() => import("@/pages/app/admin/ideas/NewIdea"));
const ScriptEditor = lazy(() => import("@/pages/app/admin/ideas/ScriptEditor"));
const VideosList = lazy(() => import("@/pages/app/admin/videos/VideosList"));
const NewVideo = lazy(() => import("@/pages/app/admin/videos/NewVideo"));
const VideoDetail = lazy(() => import("@/pages/app/admin/videos/VideoDetail"));
const CalendarPage = lazy(() => import("@/pages/app/admin/calendar/CalendarPage"));
const AssignmentsBoard = lazy(() => import("@/pages/app/admin/assignments/AssignmentsBoard"));
const NewAssignment = lazy(() => import("@/pages/app/admin/assignments/NewAssignment"));
const AssignmentDetail = lazy(() => import("@/pages/app/admin/assignments/AssignmentDetail"));
const ResourcesList = lazy(() => import("@/pages/app/admin/resources/ResourcesList"));
const ResourceEditor = lazy(() => import("@/pages/app/admin/resources/ResourceEditor"));
const ReferentesList = lazy(() => import("@/pages/app/admin/referentes/ReferentesList"));
const ReferenteDetail = lazy(() => import("@/pages/app/admin/referentes/ReferenteDetail"));
const ReferentReportView = lazy(() => import("@/pages/app/admin/referentes/ReferentReportView"));
const CarouselsList = lazy(() => import("@/pages/app/admin/carousels/CarouselsList"));
const NewCarousel = lazy(() => import("@/pages/app/admin/carousels/NewCarousel"));
const CarouselEditor = lazy(() => import("@/pages/app/admin/carousels/CarouselEditor"));
const BrollsPage = lazy(() => import("@/pages/app/admin/brolls/BrollsPage"));
const AnimationsPage = lazy(() => import("@/pages/app/admin/animations/AnimationsPage"));
const MotionGraphicsPage = lazy(() => import("@/pages/app/admin/motion-graphics/MotionGraphicsPage"));
const CoversList = lazy(() => import("@/pages/app/admin/covers/CoversList"));
const NewCover = lazy(() => import("@/pages/app/admin/covers/NewCover"));
const CoverDetail = lazy(() => import("@/pages/app/admin/covers/CoverDetail"));
const PublishingDashboard = lazy(() => import("@/pages/app/admin/publishing/PublishingDashboard"));
const NewScheduledPost = lazy(() => import("@/pages/app/admin/publishing/NewScheduledPost"));
const ScheduledPostDetail = lazy(() => import("@/pages/app/admin/publishing/ScheduledPostDetail"));
const PublishingCalendar = lazy(() => import("@/pages/app/admin/publishing/PublishingCalendar"));
const Connections = lazy(() => import("@/pages/app/admin/publishing/Connections"));
const EditorDashboard = lazy(() => import("@/pages/app/editor/EditorDashboard"));
const AssignmentView = lazy(() => import("@/pages/app/editor/AssignmentView"));
const Earnings = lazy(() => import("@/pages/app/editor/Earnings"));
const EditorReferentes = lazy(() => import("@/pages/app/editor/ReferentesView"));
const EditorReferenteDetail = lazy(() => import("@/pages/app/editor/ReferenteDetailView"));
const AdvisorDashboard = lazy(() => import("@/pages/app/advisor/AdvisorDashboard"));
const VideoFeedback = lazy(() => import("@/pages/app/advisor/VideoFeedback"));
const FormatsView = lazy(() => import("@/pages/app/advisor/FormatsView"));
const AdvisorReferentes = lazy(() => import("@/pages/app/advisor/ReferentesView"));
const AdvisorReferenteDetail = lazy(() => import("@/pages/app/advisor/ReferenteDetailView"));
const AdvisorScriptsApproval = lazy(() => import("@/pages/app/advisor/ScriptsApproval"));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/auth/callback" element={<AuthCallback />} />

          <Route path="/recursos" element={<RecursosList />} />
          <Route path="/recursos/:slug" element={<RecursoDetail />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<RoleRedirect />} />

            <Route path="admin" element={<RequireRole role="admin" />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="crear" element={<CrearPage />} />
                <Route path="ideas" element={<IdeasInbox />} />
                <Route path="ideas/new" element={<NewIdea />} />
                <Route path="ideas/:id" element={<ScriptEditor />} />
                <Route path="formats" element={<FormatsList />} />
                <Route path="videos" element={<VideosList />} />
                <Route path="videos/new" element={<NewVideo />} />
                <Route path="videos/:id" element={<VideoDetail />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="assignments" element={<AssignmentsBoard />} />
                <Route path="assignments/new" element={<NewAssignment />} />
                <Route path="assignments/:id" element={<AssignmentDetail />} />
                <Route path="resources" element={<ResourcesList />} />
                <Route path="resources/new" element={<ResourceEditor />} />
                <Route path="resources/:id" element={<ResourceEditor />} />
                <Route path="referentes" element={<ReferentesList />} />
                <Route path="referentes/:id" element={<ReferenteDetail />} />
                <Route path="referentes/:id/reportes/:reportId" element={<ReferentReportView />} />
                <Route path="carousels" element={<CarouselsList />} />
                <Route path="carousels/new" element={<NewCarousel />} />
                <Route path="carousels/:id" element={<CarouselEditor />} />
                <Route path="brolls" element={<BrollsPage />} />
                <Route path="animations" element={<AnimationsPage />} />
                <Route path="motion-graphics" element={<MotionGraphicsPage />} />
                <Route path="covers" element={<CoversList />} />
                <Route path="covers/new" element={<NewCover />} />
                <Route path="covers/:id" element={<CoverDetail />} />
                <Route path="publishing" element={<PublishingDashboard />} />
                <Route path="publishing/new" element={<NewScheduledPost />} />
                <Route path="publishing/calendar" element={<PublishingCalendar />} />
                <Route path="publishing/connections" element={<Connections />} />
                <Route path="publishing/:id" element={<ScheduledPostDetail />} />
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            <Route path="editor" element={<RequireRole role="editor" />}>
              <Route element={<EditorLayout />}>
                <Route index element={<EditorDashboard />} />
                <Route path="earnings" element={<Earnings />} />
                <Route path="referentes" element={<EditorReferentes />} />
                <Route path="referentes/:id" element={<EditorReferenteDetail />} />
                <Route path=":id" element={<AssignmentView />} />
              </Route>
            </Route>

            <Route path="advisor" element={<RequireRole role="advisor" />}>
              <Route element={<AdvisorLayout />}>
                <Route index element={<AdvisorDashboard />} />
                <Route path="scripts" element={<AdvisorScriptsApproval />} />
                <Route path="videos/:id" element={<VideoFeedback />} />
                <Route path="formats" element={<FormatsView />} />
                <Route path="referentes" element={<AdvisorReferentes />} />
                <Route path="referentes/:id" element={<AdvisorReferenteDetail />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
