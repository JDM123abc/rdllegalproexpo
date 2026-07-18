import { useState, useEffect, useCallback, useRef } from "react";
import { collection, onSnapshot, updateDoc, doc, getDocs, deleteDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ProjectForm from "./ProjectForm.js";
import ManagePersonnel from "./ManagePersonnel.js";
import ManageProcesses from "./ManageProcesses.js";
import ManageCustomers from "./ManageCustomers.js";
import ManageMachines from "./ManageMachines.js";
import ManagePersonnelTimesheets from "./ManagePersonnelTimesheets.js";
import Login from "./Login.js";
import ProjectWallDeptPlan, { getDepartmentTotals, getHoursByWS } from "./ProjectWallDeptPlan.js";
import ProjectWallJobProcessStatus from "./ProjectWallJobProcessStatus.js";
import ProjectWallKPIDashboard from "./ProjectWallKPIDashboard.js";
import ProjectWallRFQEntries from "./ProjectWallRFQEntries.js";
import ProjectWallUnscheduledWork from "./ProjectWallUnscheduledWork.js";
import ProjectWallListJobsWithout from "./ProjectWallListJobsWithout.js";
import TimesheetConsole from "./TimesheetConsole.js";
import ProjectWallMacroJobView from "./ProjectWallMacroJobView.js";
import { useLayoutEffect } from 'react'; 
import ProjectCard from "./ProjectCard.jsx";
import HeaderBar from "./HeaderBar.jsx";
import PasswordModal from "./PasswordModal.jsx";
import HoursModal from "./HoursModal.jsx";
import UnscheduledWorkModal from "./UnscheduledWorkModal.jsx";
import "./ProjectWall.css";
import MacroViewLauncher from "./MacroViewLauncher.jsx";
import ControlButtonsGrid from "./ControlButtonsGrid.jsx";
import ProductionScheduler from "./ProductionScheduler.jsx";
import PersonnelPortalLogin from "./PersonnelPortalLogin.jsx";
import ManageMaterial from "./ManageMaterial.js";
import ManageFabricationConsumables from "./ManageFabricationConsumables.js";
import ManageMachiningConsumables from "./ManageMachiningConsumables.js";
import ManageFastenerConsumables from "./ManageFastenerConsumables.js";  
import ManagePaintConsumables from "./ManagePaintConsumables.js";
import ManagePPEConsumables from "./ManagePPEConsumables.js";
import QuotingForm from "./QuotingForm.js";  // ← add this

function useIdleTimer({ timeout, onIdle, onActive }) {
  const [isIdle, setIsIdle] = useState(false);
  const timerId = useRef(null);

  const goIdle = useCallback(() => {
    setIsIdle(true);
    onIdle();
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerId.current) {
      clearTimeout(timerId.current);
    }
    if (isIdle) {
      setIsIdle(false);
      onActive && onActive();
    }
    timerId.current = window.setTimeout(goIdle, timeout);
  }, [timeout, goIdle, onActive, isIdle]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimer, true));
    timerId.current = window.setTimeout(goIdle, timeout);

    return () => {
      if (timerId.current) clearTimeout(timerId.current);
      events.forEach(event => window.removeEventListener(event, resetTimer, true));
    };
  }, [resetTimer, goIdle, timeout]);

  return { isIdle };
}

function ProjectWall({ userPhone }) {
const userName = "";   // restriction disabled for now

// MASTER SWITCH - Change this when ready
const ENABLE_PERSONNEL_PORTAL = true;   // ← Set to true when ready to deploy

const FULL_ACCESS_USERS = [
  "Accounts",
  "Admin",
  "Byron Johnson",
  "Cobus Marais",
  "Henri Kruger",
  "Marius Louw",
  "Sharl Johnson",
  "Sharon Johnson",
  "Stores",
  "Tascha"
];

const [isLoggedIn, setIsLoggedIn] = useState(true);

// === NEW STATES FOR PERSONNEL PORTAL ===
const [currentPersonnel, setCurrentPersonnel] = useState(null);
const [showPersonnelPortal, setShowPersonnelPortal] = useState(true);

  // Force stay logged in on refresh
  useEffect(() => {
    localStorage.setItem("isLoggedIn", "true");
  }, []);

  // Force stay logged in on refresh
  useEffect(() => {
    localStorage.setItem("isLoggedIn", "true");
  }, []);
  
  const [projects, setProjects] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [timesheetViewMode, setTimesheetViewMode] = useState("");
  const [showTimesheetDropdown, setShowTimesheetDropdown] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showPersonnelManager, setShowPersonnelManager] = useState(false);
  const [showProcessManager, setShowProcessManager] = useState(false);
  const [showCustomerManager, setShowCustomerManager] = useState(false);
  const [showMachineManager, setShowMachineManager] = useState(false);
  const [showPersonnelTimesheetsManager, setShowPersonnelTimesheetsManager] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [searchWS, setSearchWS] = useState("");
  const [searchQuoteNumber, setSearchQuoteNumber] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchSalesRep, setSearchSalesRep] = useState("");
  const [searchPONumber, setSearchPONumber] = useState("");
  const [searchNumberType, setSearchNumberType] = useState("po");
  const [lastDeleted, setLastDeleted] = useState(null);
  const disableDelete = true;
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const adminPassword = "Admin123";
  const recalcPassword = "Recalc123";
  const rfqPassword = "RFQ123";  
  const [currentJobsCount, setCurrentJobsCount] = useState(0);
  const [jobsOnTrackCount, setJobsOnTrackCount] = useState(0);
  const [jobsRunningLateCount, setJobsRunningLateCount] = useState(0);
  const [jobsWithoutWSorDueDateCount, setJobsWithoutWSorDueDateCount] = useState(0);
  const [sortOption, setSortOption] = useState("dueDate");
  const [recalcDate, setRecalcDate] = useState(new Date().toISOString().split("T")[0]);
  const [showRecalcSplitButton, setShowRecalcSplitButton] = useState(false);
  const [showControlCenterDropdown, setShowControlCenterDropdown] = useState(false);
  const [showHoursDropdown, setShowHoursDropdown] = useState(false);
  const [showListJobsDropdown, setShowListJobsDropdown] = useState(false);
  const [selectedListJobsOption, setSelectedListJobsOption] = useState("");
  const [showJobProcessDropdown, setShowJobProcessDropdown] = useState(false);
  const [selectedJobProcessOption, setSelectedJobProcessOption] = useState("");
  const [showRFQModal, setShowRFQModal] = useState(false);
  const [showListJobsModal, setShowListJobsModal] = useState(false);
  const [showJobProcessModal, setShowJobProcessModal] = useState(false);
  const [departmentHours, setDepartmentHours] = useState({
    milling: 0,
    turning: 0,
    wireCutting: 0,
    grinding: 0,
    fabrication: 0,
    welding: 0,
    siteInstallation: 0,
  });
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [wsHours, setWsHours] = useState([]);
  const [showUnscheduledWorkModal, setShowUnscheduledWorkModal] = useState(false);
  const [showTrend, setShowTrend] = useState(false);
  const [modalPosition, setModalPosition] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);
  const controlCenterButtonRef = useRef(null);
  const controlCenterDropdownRef = useRef(null);
  const hoursButtonRef = useRef(null);
  const timesheetButtonRef = useRef(null);
  const timesheetDropdownRef = useRef(null);
  const listJobsButtonRef = useRef(null);
  const listJobsDropdownRef = useRef(null);
  const jobProcessButtonRef = useRef(null);
  const jobProcessDropdownRef = useRef(null);
const [showMacroModalList, setShowMacroModalList] = useState(false);
const [showMacroJobView, setShowMacroJobView] = useState(false);
const [selectedMacroView, setSelectedMacroView] = useState("all");
const [showTemplateSubList, setShowTemplateSubList] = useState(false);
  const formRef = useRef(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });  // Adjust initial values as needed
  const [showProductionScheduler, setShowProductionScheduler] = useState(false);
  const [enableProductionPlanner, setEnableProductionPlanner] = useState(false);
  const [showMaterialManager, setShowMaterialManager] = useState(false);
  const [showFabricationConsumablesManager, setShowFabricationConsumablesManager] = useState(false);
  const [showMachiningConsumablesManager, setShowMachiningConsumablesManager] = useState(false);
  const [showFastenerConsumablesManager, setShowFastenerConsumablesManager] = useState(false); 
  const [showPaintConsumablesManager, setShowPaintConsumablesManager] = useState(false);
  const [showPPEConsumablesManager, setShowPPEConsumablesManager] = useState(false);
  const [showQuotingForm, setShowQuotingForm] = useState(false);
  const [showJobsOnTrackOnly, setShowJobsOnTrackOnly] = useState(false);
  const [showJobsRunningLateOnly, setShowJobsRunningLateOnly] = useState(false);   // ← add this
  const [showJobsReadyForInvoiceOnly, setShowJobsReadyForInvoiceOnly] = useState(false);
  const [jobsReadyForInvoiceCount, setJobsReadyForInvoiceCount] = useState(0);
  const [showMachineRepairsOnly, setShowMachineRepairsOnly] = useState(false);
  const [showQuotesList, setShowQuotesList] = useState(false);
  const [quotes, setQuotes] = useState([]); // will hold the list of saved quotes
  const [showJobsMissingPOOnly, setShowJobsMissingPOOnly] = useState(false);
  const [jobsMissingPOCount, setJobsMissingPOCount] = useState(0);

const [showWorksheet, setShowWorksheet] = useState(false);
const [worksheetQuoteNumber, setWorksheetQuoteNumber] = useState("");
const [selectedQuote, setSelectedQuote] = useState(null);
const [showQuoteEdit, setShowQuoteEdit] = useState(false);

useEffect(() => {
  const handleOpenWorksheet = (e) => {
    setWorksheetQuoteNumber(e.detail.quoteNumber);
    setShowWorksheet(true);
  };
  window.addEventListener('openWorksheet', handleOpenWorksheet);
  return () => window.removeEventListener('openWorksheet', handleOpenWorksheet);
}, []);

  useIdleTimer({
    timeout: 300000,
    onIdle: () => setIsAuthorized(false),
    onActive: () => {},
  });

  function parseDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [d, m, y] = dateStr.split('-');
      return `${y}-${m}-${d}`;
    }
    return null;
  }

  const calculateCountsForDate = (targetDate) => {
    console.log(`Calculating counts for ${targetDate}`);
    const counts = {
      activeJobs: 0,
      jobsOnTrack: 0,
      jobsRunningLate: 0,
      jobsWithoutWSorDueDate: 0,
      millingHours: 0,
      turningHours: 0,
      wireCuttingHours: 0,
      grindingHours: 0,
      poMillingOnTrackHours: 0,
      poMillingLateHours: 0,
      eprMillingOnTrackHours: 0,
      eprMillingLateHours: 0,
      fabricationWeldingHours: 0,
      siteInstallationHours: 0,
    };

    const targetDateStr = new Date(targetDate).toISOString().split("T")[0];
    console.log(`Normalized targetDate: ${targetDateStr}`);
    console.log(`Total projects: ${projects.length}`);

    projects.forEach((p) => {
      const isActive = p.status && p.status.trim().toLowerCase() === "active" && (!p.actualCompletionDate || p.actualCompletionDate > targetDateStr);
      const isNotDelivered = !(p.stages || []).some(
        (stage) =>
          (stage.process === "Sign Delivery Book" && stage.deliveryBookNo && stage.deliveryBookNo !== "") ||
          (stage.process === "Site Instr. Signed Off" && stage.deliveryBookNo && stage.deliveryBookNo !== "")
      );
      const orderNumberDate = p.orderNumberDate ? parseDate(p.orderNumberDate) : null;
      const currentDate = p.currentDate ? parseDate(p.currentDate) : null;
      const isRelevantDate =
        (!p.orderNumberDate && !p.currentDate) ||
        (orderNumberDate && orderNumberDate <= targetDateStr) ||
        (currentDate && currentDate <= targetDateStr);
      console.log(`Project ${p.id}:`, {
        status: p.status || "N/A",
        actualCompletionDate: p.actualCompletionDate || "N/A",
        dueDate: p.dueDate || "N/A",
        orderNumberDate: orderNumberDate || "N/A",
        currentDate: currentDate || "N/A",
        orderNumber: p.orderNumber || "N/A",
        workSheetNo: p.workSheetNo || "N/A",
        isActive,
        isNotDelivered,
        isRelevantDate,
        stages: (p.stages || []).map((s) => ({
          process: s.process,
          status: s.status,
          plannedHrs: s.plannedHrs || "N/A",
          deliveryBookNo: s.deliveryBookNo || "N/A",
        })),
      });
    });

    const activeProjects = projects.filter((p) => {
      const isActive = p.status && p.status.trim().toLowerCase() === "active" && (!p.actualCompletionDate || p.actualCompletionDate > targetDateStr);
      const isNotDelivered = !(p.stages || []).some(
        (stage) =>
          (stage.process === "Sign Delivery Book" && stage.deliveryBookNo && stage.deliveryBookNo !== "") ||
          (stage.process === "Site Instr. Signed Off" && stage.deliveryBookNo && stage.deliveryBookNo !== "")
      );
      const orderNumberDate = p.orderNumberDate ? parseDate(p.orderNumberDate) : null;
      const currentDate = p.currentDate ? parseDate(p.currentDate) : null;
      const isRelevantDate =
        (!p.orderNumberDate && !p.currentDate) ||
        (orderNumberDate && orderNumberDate <= targetDateStr) ||
        (currentDate && currentDate <= targetDateStr);
      console.log(`Project ${p.id} filter: isActive=${isActive}, isNotDelivered=${isNotDelivered}, isRelevantDate=${isRelevantDate}`);
      return isActive && isNotDelivered && isRelevantDate;
    });
    console.log(`Active projects count: ${activeProjects.length}`);

    counts.activeJobs = activeProjects.length;
    counts.jobsOnTrack = activeProjects.filter((p) => p.dueDate && p.dueDate > targetDateStr && (p.selectedTemplate !== "9 - Stock Supplied" && p.selectedTemplate !== "6 - Machine Repairs")).length;
    counts.jobsRunningLate = activeProjects.filter((p) => p.dueDate && p.dueDate < targetDateStr && (p.selectedTemplate !== "9 - Stock Supplied" && p.selectedTemplate !== "6 - Machine Repairs")).length;
    counts.jobsWithoutWSorDueDate = projects.filter((p) => {
      const isActive = p.status === "active" && (!p.actualCompletionDate || p.actualCompletionDate > targetDateStr);
      const orderNumberDate = p.orderNumberDate ? parseDate(p.orderNumberDate) : null;
      const currentDate = p.currentDate ? parseDate(p.currentDate) : null;
      const isRelevantDate =
        (!p.orderNumberDate && !p.currentDate) ||
        (orderNumberDate && orderNumberDate <= targetDateStr) ||
        (currentDate && currentDate <= targetDateStr);
      const isInvalidWS =
        !p.workSheetNo ||
        (typeof p.workSheetNo === "string" && p.workSheetNo.trim() === "") ||
        (typeof p.workSheetNo === "string" && !/^WS\d+$/.test(p.workSheetNo));
      return isActive && isRelevantDate && (isInvalidWS || !p.dueDate);
    }).length;

    activeProjects.forEach((p) => {
      const isOnTrack = p.dueDate && p.dueDate > targetDateStr;
      const isLate = p.dueDate && p.dueDate < targetDateStr;
      const isEPR = p.orderNumber && p.orderNumber.toLowerCase().includes("epr");
      const isCOD = p.orderNumber && p.orderNumber.toLowerCase().includes("cod");
      console.log(`Project ${p.id} isEPR: ${isEPR}, isCOD: ${isCOD}`);
      (p.stages || []).forEach((stage) => {
        if (stage.status !== "Completed") {
          const hrs = parseFloat(stage.plannedHrs) || 0;
          console.log(`Project ${p.id}, Stage ${stage.process}: ${hrs} hours`);
          if (stage.process === "Milling") {
            counts.millingHours += hrs;
            if (isEPR) {
              if (isOnTrack) counts.eprMillingOnTrackHours += hrs;
              if (isLate) counts.eprMillingLateHours += hrs;
            } else {
              if (isOnTrack) counts.poMillingOnTrackHours += hrs;
              if (isLate) counts.poMillingLateHours += hrs;
            }
          }
          if (stage.process === "Turning") counts.turningHours += hrs;
          if (stage.process === "Wire Cutting") counts.wireCuttingHours += hrs;
          if (stage.process === "Grinding") counts.grindingHours += hrs;
          if (stage.process === "Fabrication" || stage.process === "Welding") {
            counts.fabricationWeldingHours += hrs;
          }
          if (stage.process === "Site Installation") {
            counts.siteInstallationHours += hrs;
            console.log(`Project ${p.id}, Site Installation hours added: ${hrs}, Total: ${counts.siteInstallationHours}`);
          }
        }
      });
    });

    const totalMillingHours = (
      counts.poMillingOnTrackHours +
      counts.poMillingLateHours +
      counts.eprMillingOnTrackHours +
      counts.eprMillingLateHours
    ).toFixed(1);
    if (totalMillingHours !== counts.millingHours.toFixed(1)) {
      console.warn(
        `Milling hours discrepancy for ${targetDateStr}: ` +
        `millingHours=${counts.millingHours}, ` +
        `sum(poMillingOnTrackHours=${counts.poMillingOnTrackHours}, ` +
        `poMillingLateHours=${counts.poMillingLateHours}, ` +
        `eprMillingOnTrackHours=${counts.eprMillingOnTrackHours}, ` +
        `eprMillingLateHours=${counts.eprMillingLateHours})=${totalMillingHours}`
      );
      const unclassifiedProjects = activeProjects
        .filter((p) => {
          const hasMilling = (p.stages || []).some((stage) => stage.process === "Milling" && stage.status !== "Completed");
          const isUnclassified = !p.orderNumber || (!p.orderNumber.toLowerCase().includes("epr") && p.dueDate);
          return hasMilling && isUnclassified;
        })
        .map((p) => ({
          id: p.id,
          workSheetNo: p.workSheetNo,
          millingHours: (p.stages || [])
            .filter((stage) => stage.process === "Milling" && stage.status !== "Completed")
            .reduce((sum, stage) => sum + (parseFloat(stage.plannedHrs) || 0), 0),
        }));
      console.warn(`Unclassified milling hours from projects:`, unclassifiedProjects);
    }

    console.log(`Calculated counts for ${targetDateStr}:`, counts);
    return counts;
  };

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const unsub = onSnapshot(doc(db, "dailyCounts1", today), async (docSnap) => {
      if (!docSnap.exists()) {
        console.warn(`No counts for dailyCounts1 ${today}, calculating and saving...`);
        try {
          const counts = calculateCountsForDate(today);
          await setDoc(doc(db, "dailyCounts1", today), counts, { merge: true });
          console.log(`Saved new counts for dailyCounts1 ${today}:`, counts);
          console.log(`fabricationWeldingHours saved: ${counts.fabricationWeldingHours}`);
          console.log(`siteInstallationHours saved: ${counts.siteInstallationHours}`);
        } catch (error) {
          console.error(`Error saving counts for dailyCounts1 ${today}:`, error);
        }
      } else {
        const data = docSnap.data();
        console.log(`Fetched existing counts for dailyCounts1 ${today}:`, data);
        console.log(`fabricationWeldingHours fetched: ${data.fabricationWeldingHours}`);
        console.log(`siteInstallationHours fetched: ${data.siteInstallationHours}`);
        const requiredFields = [
          "activeJobs",
          "jobsOnTrack",
          "jobsRunningLate",
          "jobsWithoutWSorDueDate",
          "millingHours",
          "turningHours",
          "wireCuttingHours",
          "grindingHours",
          "poMillingOnTrackHours",
          "poMillingLateHours",
          "eprMillingOnTrackHours",
          "eprMillingLateHours",
          "fabricationWeldingHours",
          "siteInstallationHours",
        ];
        const missingFields = requiredFields.filter((field) => !(field in data));
        if (missingFields.length > 0) {
          console.warn(`Missing fields in dailyCounts1 ${today}: ${missingFields.join(", ")}, recalculating...`);
          const counts = calculateCountsForDate(today);
          await setDoc(doc(db, "dailyCounts1", today), counts, { merge: true });
          console.log(`Updated counts for dailyCounts1 ${today} with missing fields:`, counts);
          console.log(`fabricationWeldingHours updated: ${counts.fabricationWeldingHours}`);
          console.log(`siteInstallationHours updated: ${counts.siteInstallationHours}`);
        }
      }
    });
    return () => unsub();
  }, [projects]);
  
    // Keep jobsReadyForInvoiceCount always up-to-date
  useEffect(() => {
    const readyCount = projects.filter((p) => {
      if (!p.status || p.status.trim().toLowerCase() !== "active") return false;

      const stages = p.stages || [];
      const signDelivery = stages.find(s => s.process?.toLowerCase().trim() === "sign delivery book");
      const siteInstr = stages.find(s => s.process?.toLowerCase().trim() === "site instr. signed off");

      const isDeliveryAtAccounts = signDelivery?.status?.toLowerCase().trim() === "accounts";
      const hasDeliveryBookNo = signDelivery?.deliveryBookNo?.trim() && signDelivery?.deliveryBookNo !== "";
      const isSiteInstrComplete = siteInstr?.status?.toLowerCase().trim() === "completed";

      const isReady = isDeliveryAtAccounts || hasDeliveryBookNo || isSiteInstrComplete;

      const hasValidPO = p.orderNumber && 
                         p.orderNumber.trim() !== "" && 
                         !p.orderNumber.toLowerCase().includes("epr") && 
                         !p.orderNumber.toLowerCase().includes("cust.ga");

      return isReady && hasValidPO;
    }).length;

    setJobsReadyForInvoiceCount(readyCount);
  }, [projects]);



  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchInitialData = async () => {
      try {
        const projectSnapshot = await getDocs(collection(db, "projects"));
        const projectData = Array.from(
          new Map(projectSnapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])).values()
        );
        console.log("Initial projects fetched:", projectData.length);
        const totals = getDepartmentTotals(projectData);
        console.log("Initial department totals:", totals);
        setDepartmentHours((prev) => {
          const newHours = {
            milling: totals.milling || 0,
            turning: totals.turning || 0,
            wireCutting: totals.wireCutting || 0,
            grinding: totals.grinding || 0,
            fabrication: totals.fabrication || 0,
            welding: totals.welding || 0,
            siteInstallation: totals.siteInstallation || 0,
          };
          console.log("Setting initial departmentHours:", newHours);
          return newHours;
        });
        const processSnapshot = await getDocs(collection(db, "processes"));
        setProcesses(
          processSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order)
        );
        const personnelSnapshot = await getDocs(collection(db, "personnel"));
        setPersonnel(
          personnelSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name?.localeCompare(b.name) || 0)
        );
        const customerSnapshot = await getDocs(collection(db, "customers"));
        setCustomers(customerSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };
    fetchInitialData();
    const unsubProjects = onSnapshot(collection(db, "projects"), (snapshot) => {
      const projectData = Array.from(
        new Map(snapshot.docs.map((doc) => [doc.id, { id: doc.id, ...doc.data() }])).values()
      );
      console.log("Projects updated via snapshot:", projectData.length);
      setProjects(projectData);
      const totals = getDepartmentTotals(projectData);
      console.log("Updated department totals:", totals);
      setDepartmentHours((prev) => {
        const newHours = {
          milling: totals.milling || 0,
          turning: totals.turning || 0,
          wireCutting: totals.wireCutting || 0,
          grinding: totals.grinding || 0,
          fabrication: totals.fabrication || 0,
          welding: totals.welding || 0,
          siteInstallation: totals.siteInstallation || 0,
        };
        console.log("Setting updated departmentHours:", newHours);
        return newHours;
      });
    });
    const unsubProcesses = onSnapshot(collection(db, "processes"), (snapshot) => {
      setProcesses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order));
    });
    const unsubPersonnel = onSnapshot(collection(db, "personnel"), (snapshot) => {
      setPersonnel(
        snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.name?.localeCompare(b.name) || 0)
      );
    });
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      setCustomers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubProjects();
      unsubProcesses();
      unsubPersonnel();
      unsubCustomers();
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const unsub = onSnapshot(doc(db, "dailyCounts1", today), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log(`Fetched counts for ${today}:`, data);
        const requiredFields = [
          "activeJobs",
          "jobsOnTrack",
          "jobsRunningLate",
          "jobsWithoutWSorDueDate",
          "millingHours",
          "turningHours",
          "wireCuttingHours",
          "grindingHours",
          "poMillingOnTrackHours",
          "poMillingLateHours",
          "eprMillingOnTrackHours",
          "eprMillingLateHours",
          "fabricationWeldingHours",
          "siteInstallationHours",
        ];
        const allFieldsPresent = requiredFields.every((field) => field in data);
        const allZero = requiredFields.every((field) => data[field] === 0);
        if (!allFieldsPresent || allZero) {
          console.warn(`Missing fields or all zero counts for ${today}, recalculating...`);
          try {
            const counts = calculateCountsForDate(today);
            await setDoc(doc(db, "dailyCounts1", today), counts, { merge: false });
            console.log(`Saved recalculated counts for ${today}:`, counts);
            setCurrentJobsCount(counts.activeJobs || 0);
            setJobsOnTrackCount(counts.jobsOnTrack || 0);
            setJobsRunningLateCount(counts.jobsRunningLate || 0);
            setJobsWithoutWSorDueDateCount(counts.jobsWithoutWSorDueDate || 0);
          } catch (error) {
            console.error(`Error recalculating counts for ${today}:`, error);
          }
        } else {
          setCurrentJobsCount(data.activeJobs || 0);
          setJobsOnTrackCount(data.jobsOnTrack || 0);
          setJobsRunningLateCount(data.jobsRunningLate || 0);
		  setJobsReadyForInvoiceCount(data.jobsReadyForInvoice || 0);
          setJobsWithoutWSorDueDateCount(data.jobsWithoutWSorDueDate || 0);
        }
      } else {
        console.warn(`No counts for ${today}, calculating and saving...`);
        try {
          const counts = calculateCountsForDate(today);
          await setDoc(doc(db, "dailyCounts1", today), counts, { merge: false });
          console.log(`Saved counts for ${today}:`, counts);
          setCurrentJobsCount(counts.activeJobs || 0);
          setJobsOnTrackCount(counts.jobsOnTrack || 0);
          setJobsRunningLateCount(counts.jobsRunningLate || 0);
          setJobsWithoutWSorDueDateCount(counts.jobsWithoutWSorDueDate || 0);
        } catch (error) {
          console.error(`Error saving counts for ${today}:`, error);
          setCurrentJobsCount(0);
          setJobsOnTrackCount(0);
          setJobsRunningLateCount(0);
          setJobsWithoutWSorDueDateCount(0);
        }
      }
    });
    return () => unsub();
  }, [projects]);

  useEffect(() => {
    console.log("ProjectWall re-rendered, showReports:", showReports);
  }, [showReports]);
  
  // Auto return to portal when primary user logs out
useEffect(() => {
  if (!isLoggedIn) {
    setCurrentPersonnel(null);
  }
}, [isLoggedIn]);

  useEffect(() => {
    if (showHoursModal && modalRef.current) {
      const modal = modalRef.current;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const modalWidth = modal.offsetWidth;
      const modalHeight = modal.offsetHeight;
      const x = ((windowWidth - modalWidth) / 2 / windowWidth) * 100;
      const y = ((windowHeight - modalHeight) / 2 / window.innerHeight) * 100 - 25; // Shift up by 25%
      setModalPosition({ x: Math.max(0, Math.min(x, 90)), y: Math.max(0, Math.min(y, 90)) });
    }
  }, [showHoursModal]);

useEffect(() => {
  if (showUnscheduledWorkModal && modalRef.current) {
    const modal = modalRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const modalWidth = modal.offsetWidth;
    const modalHeight = modal.offsetHeight;
    const x = ((windowWidth - modalWidth) / 2 / windowWidth) * 100;
    const y = ((windowHeight - modalHeight) / 2 / window.innerHeight) * 100 - (showTrend ? 24.28 : 19.35); // Trend: -25, Unscheduled Work: -19.35
    setModalPosition({ x: Math.max(0, Math.min(x, 90)), y: Math.max(0, Math.min(y, 90)) });
  }
}, [showUnscheduledWorkModal, showTrend]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showHoursModal || showPasswordModal || showUnscheduledWorkModal || showForm) return;
      if (
        controlCenterButtonRef.current &&
        !controlCenterButtonRef.current.contains(e.target) &&
        controlCenterDropdownRef.current &&
        !controlCenterDropdownRef.current.contains(e.target)
      ) {
        setShowControlCenterDropdown(false);
        setShowRecalcSplitButton(false);
      }
      if (hoursButtonRef.current && !hoursButtonRef.current.contains(e.target)) {
        setShowHoursDropdown(false);
      }
      if (
        timesheetButtonRef.current &&
        !timesheetButtonRef.current.contains(e.target) &&
        timesheetDropdownRef.current &&
        !timesheetDropdownRef.current.contains(e.target)
      ) {
        setShowTimesheetDropdown(false);
      }
      if (
        listJobsButtonRef.current &&
        !listJobsButtonRef.current.contains(e.target) &&
        listJobsDropdownRef.current &&
        !listJobsDropdownRef.current.contains(e.target)
      ) {
        setShowListJobsDropdown(false);
      }
      if (
        jobProcessButtonRef.current &&
        !jobProcessButtonRef.current.contains(e.target) &&
        jobProcessDropdownRef.current &&
        !jobProcessDropdownRef.current.contains(e.target)
      ) {
        setShowJobProcessDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [
    showHoursModal,
    showPasswordModal,
    showUnscheduledWorkModal,
    showForm,
    showTimesheetDropdown,
    showListJobsDropdown,
    showJobProcessDropdown,
  ]);
// ↓↓↓ PASTE THE NEW QUOTES FETCH EFFECT RIGHT HERE ↓↓↓
useEffect(() => {
  if (!isLoggedIn) return;

  const unsubQuotes = onSnapshot(collection(db, "quotingForms"), (snapshot) => {
    const loadedQuotes = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    setQuotes(loadedQuotes);
  }, (error) => {
    console.error("Error fetching quotes:", error);
  });

  return () => unsubQuotes();
}, [isLoggedIn]);

  const handleLogOff = useCallback(() => {
    setIsLoggedIn(false);
    localStorage.removeItem("isLoggedIn");
  }, []);

  const handleManagerClick = useCallback(
    (setter) => {
      if (!isAuthorized) {
        setShowPasswordModal(true);
        setPendingAction({ type: "manager", setter });
      } else {
        setter(true);
      }
    },
    [isAuthorized]
  );

  const handleControlCenterClick = useCallback(() => {
    setShowControlCenterDropdown((prev) => !prev);
    if (!showControlCenterDropdown) setShowRecalcSplitButton(false);
  }, [showControlCenterDropdown]);

  const handleTimesheetOptionSelect = useCallback((mode) => {
    console.log("handleTimesheetOptionSelect triggered, setting timesheetViewMode to:", mode);
    setTimesheetViewMode(mode);
  }, []);

  const handleArchiveAction = useCallback(
    (projectId, actionType) => {
      if (!isAuthorized) {
        setShowPasswordModal(true);
        setPendingAction({ type: actionType, projectId });
      } else {
        if (actionType === "archive") {
          updateDoc(doc(db, "projects", projectId), { status: "archived" });
        } else if (actionType === "unarchive") {
          updateDoc(doc(db, "projects", projectId), { status: "active" });
        }
      }
    },
    [isAuthorized]
  );

  const handlePasswordSubmit = useCallback(
    async () => {
      // 1. RFQ Button - its own dedicated password
      if (pendingAction?.type === "toggleRFQModal") {
        if (passwordInput === rfqPassword) {
          setShowRFQModal(true);
        } else {
          alert("Incorrect RFQ password. Please try again.");
        }
      } 
      // 2. Recalculate Counts button
      else if (pendingAction?.type === "recalculate" && passwordInput === recalcPassword) {
        try {
          const counts = calculateCountsForDate(pendingAction.date);
          await setDoc(doc(db, "dailyCounts1", pendingAction.date), counts, { merge: false });
          setShowRecalcSplitButton(true);
        } catch (e) {
          console.error("Recalc error for " + pendingAction.date + ":", e);
        }
      } 
      // 3. Main Admin password for all other buttons
      else if (passwordInput === adminPassword) {
        setIsAuthorized(true);
        if (pendingAction?.type === "manager") {
          pendingAction.setter(true);
        } else if (pendingAction?.type === "archive" || pendingAction?.type === "unarchive") {
          handleArchiveAction(pendingAction.projectId, pendingAction.type);
        } else if (pendingAction?.type === "toggleArchived") {
          setShowArchived(!showArchived);
        } else if (pendingAction?.type === "toggleHoursDropdown") {
          handleHoursDropdownClick();
        } else if (pendingAction?.type === "toggleListJobsModal") {
          setShowListJobsModal(true);
        } else if (pendingAction?.type === "toggleJobProcessModal") {
          setShowJobProcessModal(true);
        } else if (pendingAction?.type === "toggleControlCenterDropdown") {
          handleControlCenterClick();
        } else if (pendingAction?.type === "openQuotingForm") {
          setShowQuotingForm(true);
        } else if (pendingAction?.type === "showJobsOnTrackOnly") {
          setShowJobsOnTrackOnly(true);
        }
      } 
      // 4. Wrong password for everything else
      else {
        alert("Incorrect password. Please try again.");
      }

      // Always close the modal and clean up
      setShowPasswordModal(false);
      setPasswordInput("");
      setPendingAction(null);
    },
    [passwordInput, pendingAction, handleArchiveAction, showArchived, recalcPassword, rfqPassword]
  );

const handleControlCenterOptionSelect = useCallback(
  (option) => {
    if (option === "Recalculate Counts") {
      if (!isAuthorized) {
        setShowPasswordModal(true);
        setPendingAction({ type: "recalculate", date: recalcDate });
      } else {
        setShowRecalcSplitButton(true);
      }
    } else {
      setShowControlCenterDropdown(false);
      setShowRecalcSplitButton(false);
      if (option === "Manage Personnel") {
        handleManagerClick(setShowPersonnelManager);
      } else if (option === "Manage Processes") {
        handleManagerClick(setShowProcessManager);
      } else if (option === "Manage Customers") {
        handleManagerClick(setShowCustomerManager);
      } else if (option === "Manage Machines") {
        handleManagerClick(setShowMachineManager);
      } else if (option === "Manage Material") {
        handleManagerClick(setShowMaterialManager);
      } else if (option === "Manage Fabrication Consumables") {
        handleManagerClick(setShowFabricationConsumablesManager);
      } else if (option === "Manage Machining Consumables") {
        handleManagerClick(setShowMachiningConsumablesManager);
      } else if (option === "Manage Fastener Consumables") {
        handleManagerClick(setShowFastenerConsumablesManager);
      } else if (option === "Manage Paint Consumables") {
        handleManagerClick(setShowPaintConsumablesManager);
      } else if (option === "Manage PPE Consumables") {
        handleManagerClick(setShowPPEConsumablesManager);
      } else if (option === "Manage Personnel: Time Sheets") {
        handleManagerClick(setShowPersonnelTimesheetsManager);
      }
    }
  },
  [isAuthorized, handleManagerClick, recalcDate]
);

  const handleHoursDropdownClick = useCallback(() => {
    setShowHoursDropdown((prev) => !prev);
  }, []);

  const startDrag = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);
      const rect = modalRef.current.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    []
  );

  const onDrag = useCallback(
    (e) => {
      if (dragging) {
        const x = ((e.clientX - offset.x) / window.innerWidth) * 100;
        const y = ((e.clientY - offset.y) / window.innerHeight) * 100;
        setModalPosition({
          x: Math.max(0, Math.min(x, 100 - (modalRef.current.offsetWidth / window.innerWidth) * 100)),
          y: Math.max(0, Math.min(y, 100 - (modalRef.current.offsetHeight / window.innerHeight) * 100)),
        });
      }
    },
    [dragging, offset]
  );

  const stopDrag = useCallback(() => {
    setDragging(false);
  }, []);

  const handleDelete = useCallback(
    async (id, project) => {
      if (window.confirm(`Are you sure you want to delete project ${id}?`)) {
        setLastDeleted({ id, data: project });
        await deleteDoc(doc(db, "projects", id));
      }
    },
    []
  );
  const handleCardClick = useCallback((project) => {
  setSelectedProject(project);
  setShowForm(true);
}, []);

  const handleUndoDelete = useCallback(
    async () => {
      if (lastDeleted) {
        await setDoc(doc(db, "projects", lastDeleted.id), lastDeleted.data);
        setLastDeleted(null);
      }
    },
    [lastDeleted]
  );

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleWSClick = useCallback(
    (jobId) => {
      const project = projects.find((p) => p.id === jobId);
      if (project) {
        setSelectedProject(project);
        setShowForm(true);
      } else {
        console.error("Project not found for jobId:", jobId);
      }
    },
    [projects]
  );

const onOpenProject = (project) => {
  setSelectedProject(project);
  setShowForm(true);
};

  const filterAndSortProjects = useCallback(
    (projectList) => {
      const matches = [];
      const nonMatches = [];

      projectList.forEach((p) => {
        let isMatch = false;

        // === NORMAL SEARCHES (WS, Quote, Customer, PO, etc.) ===
        if (
          (searchWS && p.workSheetNo?.toLowerCase().includes(searchWS.toLowerCase())) ||
          (searchQuoteNumber && p.quoteNumber?.toString().toLowerCase().includes(searchQuoteNumber.toLowerCase())) ||
          (searchCustomer && p.customer?.toLowerCase().includes(searchCustomer.toLowerCase())) ||
          (searchPONumber.trim() && p.orderNumber?.toString().toLowerCase().includes(searchPONumber.toLowerCase()))
        ) {
          isMatch = true;
        }

        // === SALES REP SEARCHES ===
        else if (searchSalesRep) {
          const salesRepMatch = p.salesRep?.toLowerCase().includes(searchSalesRep.toLowerCase());

          if (searchNumberType === "salesRepActive") {
            // === THIS IS THE PART THAT KILLS ALL ORANGE & ALL BLUE CARDS ===
            const isReadyForInvoiceOrAwaitingPO = (() => {
              const stages = p.stages || [];

              // Delivery stage exists?
              const deliveryIdx = stages.findIndex(
                s =>
                  s.process?.toLowerCase().trim() === "sign delivery book" ||
                  s.process?.toLowerCase().trim() === "site instr. signed off"
              );
              const deliveryExists = deliveryIdx !== -1;

              // Invoiced row (always last)
              const invoicedExists = stages.length > 0 && stages[stages.length - 1]?.process === "Invoiced";

              if (!deliveryExists && !invoicedExists) return false;

              const checkUpTo = deliveryExists ? deliveryIdx : stages.length - 1;

              // All previous stages must be green/completed
              const allPrevCompleted = stages
                .slice(0, checkUpTo)
                .every(s =>
                  ["completed", "completed: qc pass", "drawing reviewed", "drawing not reviewed"].includes(
                    s.status?.toLowerCase().trim()
                  )
                );

              if (!allPrevCompleted) return false;

              // If we reach here → job is ready → either BLUE or ORANGE
              return true;
            })();

            // ONLY include if sales rep matches AND job is NOT ready (i.e. still truly active)
            isMatch = salesRepMatch && !isReadyForInvoiceOrAwaitingPO;
          } 
          else if (searchNumberType === "salesRep") {
            // All Jobs → show everything
            isMatch = salesRepMatch;
          }
        }

        if (isMatch) {
          matches.push({ ...p, isMatch: true });
        } else {
          nonMatches.push({ ...p, isMatch: false });
        }
      });

      // === SORTING (safe) ===
      const sortProjects = (a, b) => {
        if (sortOption === "wsAsc") {
          const numA = parseInt(a.workSheetNo?.replace("WS", "") || "0", 10);
          const numB = parseInt(b.workSheetNo?.replace("WS", "") || "0", 10);
          return (isNaN(numA) ? 999999 : numA) - (isNaN(numB) ? 999999 : numB);
        }
        if (sortOption === "wsDesc") {
          const numA = parseInt(a.workSheetNo?.replace("WS", "") || "0", 10);
          const numB = parseInt(b.workSheetNo?.replace("WS", "") || "0", 10);
          return (isNaN(numB) ? 999999 : numB) - (isNaN(numA) ? 999999 : numA);
        }
        const dateA = a.dueDate ? new Date(a.dueDate) : null;
        const dateB = b.dueDate ? new Date(b.dueDate) : null;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA - dateB;
      };

      return [...matches.sort(sortProjects), ...nonMatches.sort(sortProjects)];
    },
    [searchWS, searchQuoteNumber, searchCustomer, searchSalesRep, searchPONumber, searchNumberType, sortOption]
  );

let filteredProjects = projects.filter((p) => 
  p.status && p.status.trim().toLowerCase() === "active"
);

let activeProjects;

// Button 6: STRICT Green Cards Only
if (showJobsOnTrackOnly) {
  const today = new Date().toISOString().split("T")[0];
  
  activeProjects = filteredProjects.filter((p) => {
    if (!p.dueDate) return false;

    const isOnTrack = p.dueDate > today;
    const isSpecial = p.selectedTemplate === "9 - Stock Supplied" || 
                      p.selectedTemplate === "6 - Machine Repairs";

    const stages = p.stages || [];
    const deliveryIdx = stages.findIndex(s => 
      s.process?.toLowerCase().trim() === "sign delivery book" ||
      s.process?.toLowerCase().trim() === "site instr. signed off"
    );
    const isBlue = deliveryIdx !== -1 && stages.slice(0, deliveryIdx).every(s =>
      ["completed", "completed: qc pass", "drawing reviewed", "drawing not reviewed"].includes(
        s.status?.toLowerCase().trim()
      )
    );

    return isOnTrack && !isSpecial && !isBlue;
  });
} 
// Button 9: STRICT Red Cards Only
else if (showJobsRunningLateOnly) {
  const today = new Date().toISOString().split("T")[0];
  
  activeProjects = filteredProjects.filter((p) => {
    if (!p.dueDate) return false;

    const isLate = p.dueDate < today;
    const isSpecial = p.selectedTemplate === "9 - Stock Supplied" || 
                      p.selectedTemplate === "6 - Machine Repairs";

    const stages = p.stages || [];
    const deliveryIdx = stages.findIndex(s => 
      s.process?.toLowerCase().trim() === "sign delivery book" ||
      s.process?.toLowerCase().trim() === "site instr. signed off"
    );
    const isBlue = deliveryIdx !== -1 && stages.slice(0, deliveryIdx).every(s =>
      ["completed", "completed: qc pass", "drawing reviewed", "drawing not reviewed"].includes(
        s.status?.toLowerCase().trim()
      )
    );

    return isLate && !isSpecial && !isBlue;
  });
} 
// Button 12: Jobs Ready for Invoice Only   <--- NEW
else if (showJobsReadyForInvoiceOnly) {
  activeProjects = filteredProjects.filter((p) => {
    if (!p.status || p.status.trim().toLowerCase() !== "active") return false;

    const stages = p.stages || [];
    const signDelivery = stages.find(s => s.process?.toLowerCase().trim() === "sign delivery book");
    const siteInstr = stages.find(s => s.process?.toLowerCase().trim() === "site instr. signed off");

    const isDeliveryAtAccounts = signDelivery?.status?.toLowerCase().trim() === "accounts";
    const hasDeliveryBookNo = signDelivery?.deliveryBookNo?.trim() && signDelivery?.deliveryBookNo !== "";
    const isSiteInstrComplete = siteInstr?.status?.toLowerCase().trim() === "completed";

    const isReady = isDeliveryAtAccounts || hasDeliveryBookNo || isSiteInstrComplete;

    const hasValidPO = p.orderNumber && 
                       p.orderNumber.trim() !== "" && 
                       !p.orderNumber.toLowerCase().includes("epr") && 
                       !p.orderNumber.toLowerCase().includes("cust.ga");

    return isReady && hasValidPO;
  });
} 
// Button 15: Jobs Missing PO Only   ←←← NEW
else if (showJobsMissingPOOnly) {
  activeProjects = filteredProjects.filter((p) => {
    const stages = p.stages || [];
    if (!stages.length) return false;

    const deliveryIdx = stages.findIndex(s => 
      s.process?.toLowerCase().trim() === "sign delivery book"
    );
    const siteInstrIdx = stages.findIndex(s => 
      s.process?.toLowerCase().trim() === "site instr. signed off"
    );
    const finalIdx = Math.max(deliveryIdx, siteInstrIdx);
    if (finalIdx === -1) return false;

    const allPreviousCompleted = stages.slice(0, finalIdx).every(s =>
      ["completed", "completed: qc pass", "drawing reviewed", "drawing not reviewed"].includes(
        s.status?.toLowerCase().trim()
      )
    );
    if (!allPreviousCompleted) return false;

    const hasValidPO = p.orderNumber && 
                       p.orderNumber.trim() !== "" && 
                       !p.orderNumber.toLowerCase().includes("epr") && 
                       !p.orderNumber.toLowerCase().includes("cust.ga");

    return !hasValidPO;
  });
} 
else if (showMachineRepairsOnly) {
  activeProjects = filteredProjects.filter((p) => p.selectedTemplate === "6 - Machine Repairs");
} 
else {
  activeProjects = filterAndSortProjects(
    filteredProjects.filter(p => p.selectedTemplate !== "6 - Machine Repairs")
  );
}

  const archivedProjects = filterAndSortProjects(projects.filter((p) => p.status === "archived"));
  const isSearchEmpty = !searchWS && !searchCustomer && !searchSalesRep && !searchPONumber;
  const noInoMatches = !isSearchEmpty && activeProjects.length > 0 && activeProjects.every((p) => !p.isMatch);

  const clearSearch = useCallback(() => {
    setSearchWS("");
    setSearchQuoteNumber("");
    setSearchCustomer("");
    setSearchSalesRep("");
    setSearchPONumber("");
    setSearchNumberType("po");
  }, []);

if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

const saveAsPDF = (personnel, jobs) => {
  const doc = new jsPDF({ orientation: "landscape" });
  autoTable(doc, {
    head: [["Project", "Process Status", "Sales Rep", "Company", "Days left/Overdue", "PO: Days Active", "Job Description", "Due Date", "Job Status"]],
    body: jobs.map((job) => [
      job.wsNo,
      job.processStatus,
      job.personnel,
      job.company,
      job.daysLeftOverdue,
      job.poDaysActive,
      job.jobDescription,
      job.dueDate,
      job.jobStatus,
    ]),
    startY: 20,
    styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 30 },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
      5: { cellWidth: 30 },
      6: { cellWidth: 30 },
      7: { cellWidth: 30 },
      8: { cellWidth: 30 },
    },
  });
  doc.setFontSize(16);
  doc.text(`${selectedDepartment} Hours`, 10, 10);
  const timestamp = new Date().toLocaleString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).replace(/, /, '_').replace(/ /g, '-').replace(/:(\d{2})\s/, '-');
  doc.save(`${selectedDepartment}_${personnel}_${timestamp}.pdf`);
};

return (
  <div style={{ position: "relative" }}>
<HeaderBar
  onLogOff={handleLogOff}
  onPrint={handlePrint}
  isAuthorized={isAuthorized}
  onShowPasswordModal={() => setShowPasswordModal(true)}
  setPendingAction={setPendingAction}
  projects={projects}
  userName={userName}          

/>
    <ControlButtonsGrid
      setSelectedProject={setSelectedProject}
      setShowForm={setShowForm}
      setPosition={setPosition}
      searchNumberType={searchNumberType}
      setSearchNumberType={setSearchNumberType}
      isAuthorized={isAuthorized}
      setShowPasswordModal={setShowPasswordModal}
      setPendingAction={setPendingAction}
      currentJobsCount={currentJobsCount}
      showArchived={showArchived}
      setShowArchived={setShowArchived}
      archivedProjects={archivedProjects}
      searchSalesRep={searchSalesRep}
      setSearchSalesRep={setSearchSalesRep}
      searchWS={searchWS}
      setSearchWS={setSearchWS}
      searchQuoteNumber={searchQuoteNumber}
      setSearchQuoteNumber={setSearchQuoteNumber}
      searchCustomer={searchCustomer}
      setSearchCustomer={setSearchCustomer}
      searchPONumber={searchPONumber}
      setSearchPONumber={setSearchPONumber}
      jobsOnTrackCount={jobsOnTrackCount}
      controlCenterButtonRef={controlCenterButtonRef}
      showControlCenterDropdown={showControlCenterDropdown}
      controlCenterDropdownRef={controlCenterDropdownRef}
      showRecalcSplitButton={showRecalcSplitButton}
      recalcDate={recalcDate}
      setRecalcDate={setRecalcDate}
      calculateCountsForDate={calculateCountsForDate}
      handleControlCenterClick={handleControlCenterClick}
      handleControlCenterOptionSelect={handleControlCenterOptionSelect}
      clearSearch={clearSearch}
      jobsRunningLateCount={jobsRunningLateCount}
      hoursButtonRef={hoursButtonRef}
      showHoursDropdown={showHoursDropdown}
      handleHoursDropdownClick={handleHoursDropdownClick}
      setSelectedDepartment={setSelectedDepartment}
      getHoursByWS={getHoursByWS}
      setWsHours={setWsHours}
      setShowHoursModal={setShowHoursModal}
      setShowHoursDropdown={setShowHoursDropdown}
      setShowRFQModal={setShowRFQModal}
      showRFQModal={showRFQModal}
      projects={projects}
      listJobsButtonRef={listJobsButtonRef}
      showListJobsDropdown={showListJobsDropdown}
      setShowListJobsDropdown={setShowListJobsDropdown}
      listJobsDropdownRef={listJobsDropdownRef}
      setShowListJobsModal={setShowListJobsModal}
      setSelectedListJobsOption={setSelectedListJobsOption}
      selectedListJobsOption={selectedListJobsOption}
      setShowUnscheduledWorkModal={setShowUnscheduledWorkModal}
      setShowTrend={setShowTrend}
      activeProjects={activeProjects}
      handleWSClick={handleWSClick}
      jobProcessButtonRef={jobProcessButtonRef}
      showJobProcessDropdown={showJobProcessDropdown}
      setShowJobProcessDropdown={setShowJobProcessDropdown}
      jobProcessDropdownRef={jobProcessDropdownRef}
      setShowJobProcessModal={setShowJobProcessModal}
      setSelectedJobProcessOption={setSelectedJobProcessOption}
      selectedJobProcessOption={selectedJobProcessOption}
      timesheetButtonRef={timesheetButtonRef}
      showTimesheetDropdown={showTimesheetDropdown}
      setShowTimesheetDropdown={setShowTimesheetDropdown}
      timesheetDropdownRef={timesheetDropdownRef}
      handleTimesheetOptionSelect={handleTimesheetOptionSelect}
      sortOption={sortOption}
      setSortOption={setSortOption}
      setShowMacroModalList={setShowMacroModalList}
      showListJobsModal={showListJobsModal}
      showJobProcessModal={showJobProcessModal}
      showForm={showForm}
	  setShowProductionScheduler={setShowProductionScheduler}
	  enableProductionPlanner={enableProductionPlanner}
	  setShowQuotingForm={setShowQuotingForm}   // ← add this
	  setShowQuotesList={setShowQuotesList}   // ← add this line
	  onOpenProject={onOpenProject}   // ← add this
	  setShowJobsOnTrackOnly={setShowJobsOnTrackOnly}   // ← ADD THIS LINE
	  setShowJobsRunningLateOnly={setShowJobsRunningLateOnly}   // ← ADD THIS NEW LINE
	  setShowJobsReadyForInvoiceOnly={setShowJobsReadyForInvoiceOnly}
      showJobsReadyForInvoiceOnly={showJobsReadyForInvoiceOnly}
      jobsReadyForInvoiceCount={jobsReadyForInvoiceCount}
	  setShowJobsMissingPOOnly={setShowJobsMissingPOOnly}
      showJobsMissingPOOnly={showJobsMissingPOOnly}
	  setShowMachineRepairsOnly={setShowMachineRepairsOnly}
      showMachineRepairsOnly={showMachineRepairsOnly}
	  
    />

      {isSearchEmpty && <p style={{ color: "#666", marginBottom: "10px" }}>Start your search</p>}
      {noInoMatches && !isSearchEmpty && <p style={{ color: "red", marginBottom: "10px" }}>No matches found</p>}

      {/* ==================== PERSONNEL PORTAL AREA ==================== */}
      {ENABLE_PERSONNEL_PORTAL && currentPersonnel === null ? (
        /* NEW PORTAL - 31 PIN Cards */
        <PersonnelPortalLogin
          personnel={personnel}
          onLoginSuccess={(person) => {
            setCurrentPersonnel(person);
          }}
        />
      ) : currentPersonnel !== null ? (
        /* Someone is logged in via Portal */
        <>
          {/* Welcome / Status Bar */}
          <div style={{
            background: "#f0f0f0",
            padding: "12px 20px",
            marginBottom: "15px",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <strong>Welcome, {currentPersonnel.name}</strong>
              <span style={{ marginLeft: "15px", color: "#666" }}>
                {FULL_ACCESS_USERS.some(n => 
                  n.toLowerCase() === currentPersonnel.name.toLowerCase()
                ) ? "Full Access - All Jobs" : "My Jobs"}
              </span>
            </div>
            
            <button
              onClick={() => setCurrentPersonnel(null)}
              style={{
                background: "#d32f2f",
                color: "white",
                border: "none",
                padding: "8px 18px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500"
              }}
            >
              Log Out • Return to Portal
            </button>
          </div>

          {/* Job Cards */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
            {(showArchived ? archivedProjects : activeProjects)
              .filter(p => {
                const personName = currentPersonnel.name ? currentPersonnel.name.trim() : "";
                const isFullAccess = FULL_ACCESS_USERS.some(fullName => 
                  fullName.toLowerCase() === personName.toLowerCase()
                );
                return isFullAccess || p.salesRep?.trim() === personName;
              })
              .map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  isAuthorized={isAuthorized}
                  onCardClick={handleCardClick}
                  onArchive={handleArchiveAction}
                  onDelete={handleDelete}
                  isArchived={showArchived}
                />
              ))}
          </div>
        </>
      ) : (
        /* OLD BEHAVIOUR - Show all job cards (when portal is disabled) */
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "10px" }}>
          {(showArchived ? archivedProjects : activeProjects).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isAuthorized={isAuthorized}
              onCardClick={handleCardClick}
              onArchive={handleArchiveAction}
              onDelete={handleDelete}
              isArchived={showArchived}
            />
          ))}
        </div>
      )}
	  
{showForm && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "transparent",
      zIndex: 10002,
      overflow: "hidden",
      padding: 0,
      margin: 0,
    }}
    onClick={() => {
      setShowForm(false);
      setSelectedProject(null);
    }}
  >
    <div
      ref={formRef}
      style={{
        background: "#fff",
        border: "3px solid #000",
        borderRadius: "0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        width: "100vw",
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* BLACK BAR — X ON THE RIGHT, 50px FROM EDGE */}
      <div
        style={{
          width: "100%",
          height: "50px",
          background: "#333",
          cursor: "move",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
<button
  onClick={() => {
    setShowForm(false);
    setSelectedProject(null);
  }}
  style={{
    marginRight: "50px",
    width: "36px",
    height: "36px",
    background: "#ff4444",
    color: "white",
    border: "3px solid #000",
    borderRadius: "50%",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  }}
>
  X
</button>
      </div>

      {/* Form content below the bar */}
      <div style={{ paddingTop: "60px" }}>
<ProjectForm
  onClose={() => {
    setShowForm(false);
    setSelectedProject(null);
  }}
  project={selectedProject}
  processes={processes}
  personnel={personnel}
  customers={customers}
  isArchived={showArchived}     // ← ADD THIS LINE
/>
      </div>

      {/* Custom scrollbar */}
      <style jsx>{`
        div::-webkit-scrollbar { width: 16px; }
        div::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        div::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; border: 3px solid #fff; }
        div::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  </div>
)}
{showQuotingForm && (
  <QuotingForm
    onClose={() => setShowQuotingForm(false)}
    selectedTemplate="Select Stage Template"
    stages={[]}
    onStagesUpdate={() => {}}
    onTemplateChange={() => {}}
  />
)}

{showWorksheet && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "transparent",
      zIndex: 9999,
      overflow: "hidden",
      padding: 0,
      margin: 0,
    }}
    onClick={() => {
      setShowWorksheet(false);
      setWorksheetQuoteNumber("");
    }}
  >
    <div
      style={{
        background: "#fff",
        border: "3px solid #000",
        borderRadius: "0",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
        width: "100vw",
        height: "100vh",
        overflowY: "auto",
        overflowX: "hidden",
        position: "relative",
        boxSizing: "border-box",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          width: "100%",
          height: "50px",
          background: "#333",
          cursor: "move",
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
        }}
      >
<button
  onClick={() => {
    // Simple close for now - no warning on global X
    setShowForm(false);
    setSelectedProject(null);
  }}
  style={{
    marginRight: "50px",
    width: "36px",
    height: "36px",
    background: "#ff4444",
    color: "white",
    border: "3px solid #000",
    borderRadius: "50%",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  }}
>
  X
</button>
      </div>

      <div style={{ paddingTop: "60px" }}>
        <ProjectForm
          onClose={() => {
            setShowWorksheet(false);
            setWorksheetQuoteNumber("");
          }}
          project={{ quoteNumber: worksheetQuoteNumber }}
          processes={processes}
          personnel={personnel}
          customers={customers}
        />
      </div>

      <style jsx>{`
        div::-webkit-scrollbar { width: 16px; }
        div::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        div::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; border: 3px solid #fff; }
        div::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>
    </div>
  </div>
)}

{showQuotesList && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 10001,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={() => setShowQuotesList(false)}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "8px",
        width: "90%",
        maxWidth: "800px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>Saved Quotes</h2>
        <button
          onClick={() => setShowQuotesList(false)}
          style={{
            background: "#ff4444",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            fontSize: "20px",
            cursor: "pointer",
          }}
        >
          X
        </button>
      </div>

      {quotes.length === 0 ? (
        <p>No quotes saved yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95em" }}>
          <thead>
            <tr style={{ background: "#f8f8f8" }}>
              <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Quote # (click to open)</th>
              <th style={{ padding: "12px", border: "1px solid #ddd", textAlign: "left" }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  <button
                    onClick={() => {
                      setSelectedQuote(q);
                      setShowQuoteEdit(true);
                      setShowQuotesList(false); // optional: close list modal
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#0066cc",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: "inherit",
                      padding: 0,
                    }}
                  >
                    {q.quoteNumber}
                  </button>
                </td>
                <td style={{ padding: "12px", border: "1px solid #ddd" }}>
                  {q.createdAt?.toDate ? q.createdAt.toDate().toLocaleString() : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
)}

{/* Edit/View Quote Modal */}
{showQuoteEdit && selectedQuote && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.5)",
      zIndex: 10002,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={() => setShowQuoteEdit(false)}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "8px",
        width: "90%",
        maxWidth: "1000px",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "20px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ margin: 0 }}>Quote: {selectedQuote.quoteNumber}</h2>
<button
  onClick={() => {
    // Simple close for now - no warning on global X
    setShowForm(false);
    setSelectedProject(null);
  }}
  style={{
    marginRight: "50px",
    width: "36px",
    height: "36px",
    background: "#ff4444",
    color: "white",
    border: "3px solid #000",
    borderRadius: "50%",
    fontSize: "20px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
  }}
>
  X
</button>
      </div>

      {/* Simple read-only view - expand later if you want edit */}
      <div style={{ display: "grid", gap: "12px" }}>
        <div>
          <strong>Email:</strong> {selectedQuote.email || "-"}
        </div>
        <div>
          <strong>Company:</strong> {selectedQuote.company || "-"}
        </div>
        <div>
          <strong>Attention:</strong> {selectedQuote.attention || "-"}
        </div>
        <div>
          <strong>Total ex VAT:</strong> {selectedQuote.totalCostExVat || "-"}
        </div>
        <div>
          <strong>Date:</strong> {selectedQuote.date || "-"}
        </div>
        <div>
          <strong>Created:</strong>{" "}
          {selectedQuote.createdAt?.toDate ? selectedQuote.createdAt.toDate().toLocaleString() : "-"}
        </div>
        {/* Add more fields as needed */}
      </div>
    </div>
  </div>
)}

<> {/* Fragment wrapper - all remaining modals go here */}
  {showPersonnelManager && <ManagePersonnel onClose={() => setShowPersonnelManager(false)} />}
  {showProcessManager && <ManageProcesses onClose={() => setShowProcessManager(false)} />}
  {showCustomerManager && <ManageCustomers onClose={() => setShowCustomerManager(false)} />}
  {showMachineManager && <ManageMachines onClose={() => setShowMachineManager(false)} />}
  {showMaterialManager && <ManageMaterial onClose={() => setShowMaterialManager(false)} />}
  {showFabricationConsumablesManager && <ManageFabricationConsumables onClose={() => setShowFabricationConsumablesManager(false)} />}
  {showMachiningConsumablesManager && <ManageMachiningConsumables onClose={() => setShowMachiningConsumablesManager(false)} />}
  {showFastenerConsumablesManager && <ManageFastenerConsumables onClose={() => setShowFastenerConsumablesManager(false)} />}
  {showPaintConsumablesManager && <ManagePaintConsumables onClose={() => setShowPaintConsumablesManager(false)} />}
  {showPPEConsumablesManager && <ManagePPEConsumables onClose={() => setShowPPEConsumablesManager(false)} />}
  {showPersonnelTimesheetsManager && <ManagePersonnelTimesheets onClose={() => setShowPersonnelTimesheetsManager(false)} />}

  <HoursModal
    showHoursModal={showHoursModal}
    modalRef={modalRef}
    modalPosition={modalPosition}
    onDrag={onDrag}
    stopDrag={stopDrag}
    startDrag={startDrag}
    dragging={dragging}
    selectedDepartment={selectedDepartment}
    wsHours={wsHours}
    projects={projects}
    handleWSClick={handleWSClick}
    setShowHoursModal={setShowHoursModal}
  />

  <PasswordModal
    showPasswordModal={showPasswordModal}
    passwordInput={passwordInput}
    setPasswordInput={setPasswordInput}
    handlePasswordSubmit={handlePasswordSubmit}
    setShowPasswordModal={setShowPasswordModal}
    setPendingAction={setPendingAction}
  />

  {showUnscheduledWorkModal && (
    <ProjectWallUnscheduledWork
      onClose={() => {
        setShowUnscheduledWorkModal(false);
        setShowTrend(false);
      }}
      modalRef={modalRef}
      modalPosition={modalPosition}
      setModalPosition={setModalPosition}
      dragging={dragging}
      setDragging={setDragging}
      offset={offset}
      setOffset={setOffset}
      startDrag={startDrag}
      onDrag={onDrag}
      stopDrag={stopDrag}
      showTrend={showTrend}
    />
  )}

  <MacroViewLauncher
    showMacroModalList={showMacroModalList}
    setShowMacroModalList={setShowMacroModalList}
    setShowMacroJobView={setShowMacroJobView}
    setSelectedMacroView={setSelectedMacroView}
    showTemplateSubList={showTemplateSubList}
    setShowTemplateSubList={setShowTemplateSubList}
  />

  {showMacroJobView && (
    <ProjectWallMacroJobView
      projects={projects}
      onClose={() => setShowMacroJobView(false)}
      onOpenProject={(project) => {
        setSelectedProject(project);
        setShowForm(true);
      }}
      view={selectedMacroView}
    />
  )}

  {showProductionScheduler && (
    <ProductionScheduler
      projects={projects}
      onClose={() => setShowProductionScheduler(false)}
      onOpenProject={(project) => {
        setSelectedProject(project);
        setShowForm(true);
        //setShowProductionScheduler(false);
      }}
    />
  )}

  <TimesheetConsole
    projects={projects}
    personnel={personnel}
    handleWSClick={handleWSClick}
    viewMode={timesheetViewMode}
    setViewMode={setTimesheetViewMode}
  />
</>
    </div>
  );
}

export default ProjectWall;