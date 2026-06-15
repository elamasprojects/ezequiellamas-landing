import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

// Public product landing — lazy (heavy, rarely hit)
const ContentCenter = lazy(() => import("@/pages/ContentCenter"));
const ContentCenterFeatures = lazy(() => import("@/pages/ContentCenterFeatures"));
const ContentCenterDemo = lazy(() => import("@/pages/ContentCenterDemo"));

// Lazy-loaded pages
const AdminDashboard = lazy(() => import("@/pages/app/admin/AdminDashboard"));
const SettingsPage = lazy(() => import("@/pages/app/admin/settings/SettingsPage"));
const CrearPage = lazy(() => import("@/pages/app/admin/crear/CrearPage"));
const YoutubeHub = lazy(() => import("@/pages/app/admin/youtube/YoutubeHub"));
const StudioProjectEditor = lazy(() => import("@/pages/app/admin/studio/ProjectEditor"));
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
const ResourcesHub = lazy(() => import("@/pages/app/admin/resources/ResourcesHub"));
const ResourceEditor = lazy(() => import("@/pages/app/admin/resources/ResourceEditor"));
const ReferentesList = lazy(() => import("@/pages/app/admin/referentes/ReferentesList"));
const ReferenteDetail = lazy(() => import("@/pages/app/admin/referentes/ReferenteDetail"));
const ReferentReportView = lazy(() => import("@/pages/app/admin/referentes/ReferentReportView"));
const CarouselsList = lazy(() => import("@/pages/app/admin/carousels/CarouselsList"));
const NewCarousel = lazy(() => import("@/pages/app/admin/carousels/NewCarousel"));
const CarouselEditor = lazy(() => import("@/pages/app/admin/carousels/CarouselEditor"));
const NewCover = lazy(() => import("@/pages/app/admin/covers/NewCover"));
const CoverDetail = lazy(() => import("@/pages/app/admin/covers/CoverDetail"));
const PublishingDashboard = lazy(() => import("@/pages/app/admin/publishing/PublishingDashboard"));
const NewScheduledPost = lazy(() => import("@/pages/app/admin/publishing/NewScheduledPost"));
const BatchUpload = lazy(() => import("@/pages/app/admin/publishing/BatchUpload"));
const ReelProposals = lazy(() => import("@/pages/app/admin/publishing/ReelProposals"));
const ScheduledPostDetail = lazy(() => import("@/pages/app/admin/publishing/ScheduledPostDetail"));
const PublishingCalendar = lazy(() => import("@/pages/app/admin/publishing/PublishingCalendar"));
const Connections = lazy(() => import("@/pages/app/admin/publishing/Connections"));
const PublishingSlots = lazy(() => import("@/pages/app/admin/publishing/PublishingSlots"));
const EngagementPage = lazy(() => import("@/pages/app/admin/engagement/EngagementPage"));
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

          <Route path="/content-center" element={<ContentCenter />} />
          <Route path="/content-center/features" element={<ContentCenterFeatures />} />
          <Route path="/content-center/demo/presentation-video" element={<ContentCenterDemo />} />

          <Route path="/app" element={<AppLayout />}>
            <Route index element={<RoleRedirect />} />

            <Route path="admin" element={<RequireRole role="admin" />}>
              <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="crear" element={<CrearPage />} />
                <Route path="ideas" element={<IdeasInbox />} />
                <Route path="ideas/new" element={<NewIdea />} />
                <Route path="ideas/:id" element={<ScriptEditor />} />
                <Route path="formats" element={<Navigate to="/app/admin/settings?tab=formatos" replace />} />
                <Route path="videos" element={<VideosList />} />
                <Route path="videos/new" element={<NewVideo />} />
                <Route path="videos/:id" element={<VideoDetail />} />
                <Route path="calendar" element={<CalendarPage />} />
                <Route path="assignments" element={<AssignmentsBoard />} />
                <Route path="assignments/new" element={<NewAssignment />} />
                <Route path="assignments/:id" element={<AssignmentDetail />} />
                <Route path="resources" element={<ResourcesHub />} />
                <Route path="resources/new" element={<ResourceEditor />} />
                <Route path="resources/:id" element={<ResourceEditor />} />
                <Route path="referentes" element={<ReferentesList />} />
                <Route path="referentes/:id" element={<ReferenteDetail />} />
                <Route path="referentes/:id/reportes/:reportId" element={<ReferentReportView />} />
                <Route path="youtube" element={<YoutubeHub />} />
                <Route path="studio" element={<Navigate to="/app/admin/youtube?tab=proyectos" replace />} />
                <Route path="studio/:id" element={<StudioProjectEditor />} />
                <Route path="carousels" element={<CarouselsList />} />
                <Route path="carousels/new" element={<NewCarousel />} />
                <Route path="carousels/:id" element={<CarouselEditor />} />
                <Route path="brolls" element={<Navigate to="/app/admin/resources?tab=brolls" replace />} />
                <Route path="animations" element={<Navigate to="/app/admin/resources?tab=animations" replace />} />
                <Route path="motion-graphics" element={<Navigate to="/app/admin/resources?tab=motion" replace />} />
                <Route path="covers" element={<Navigate to="/app/admin/resources?tab=portadas" replace />} />
                <Route path="covers/new" element={<NewCover />} />
                <Route path="covers/:id" element={<CoverDetail />} />
                <Route path="publishing" element={<PublishingDashboard />} />
                <Route path="publishing/new" element={<NewScheduledPost />} />
                <Route path="publishing/batch" element={<BatchUpload />} />
                <Route path="publishing/reels" element={<ReelProposals />} />
                <Route path="publishing/calendar" element={<PublishingCalendar />} />
                <Route path="publishing/connections" element={<Connections />} />
                <Route path="publishing/slots" element={<PublishingSlots />} />
                <Route path="publishing/:id" element={<ScheduledPostDetail />} />
                <Route path="engagement" element={<EngagementPage />} />
                <Route path="team" element={<Navigate to="/app/admin/settings?tab=equipo" replace />} />
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
