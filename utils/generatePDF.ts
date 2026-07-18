import { Platform, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';

export const generateAndSharePDF = async (invoice: any, isEnglish: boolean = true) => {
  if (!invoice?.clientName) {
    Alert.alert("Error", "Please select a client first");
    return;
  }

  const invoiceNo = invoice.invoiceNumber || "Draft";
  const clientName = invoice.clientName || "Unknown Client";
  const fileName = `${isEnglish ? "Invoice" : "Faktuur"}_${invoiceNo} - ${clientName}`.replace(/[/\\?%*:|"<>]/g, '-');

  // Load local PNG logo (direct import - no base64)
  let logoSrc = "https://i.imgur.com/your-logo-left.png"; // fallback

  try {
    const logoAsset = Asset.fromModule(require('../assets/RDL Logo-1.png'));
    await logoAsset.downloadAsync();
    logoSrc = logoAsset.uri || logoSrc;
  } catch (e) {
    console.warn("Logo load failed, using fallback", e);
  }

  let servicesHTML = '';

  // === FULL BILINGUAL formal order: 01 to 16 ===
  const formalRows = [
    { 
      num: "01", 
      descEn: `Professional services rendered to ${invoice.clientName || 'Client'} (Business calls)`, 
      descAf: `Professionele dienste gelewer aan ${invoice.clientName || 'Kliënt'} (Besigheid oproepe)`, 
      amount: invoice.businessTotal || 0 
    },
    { num: "02", descEn: "Taking of instructions from:", descAf: "Neem van instruksies van:", key: "min1" },
    { num: "03", descEn: "Examine and study documents and attachments received from:", descAf: "Deurlees en bestudeer van dokumente en aanhangsels ontvang van:", key: "min2" },
    { num: "04", descEn: "Receive and study e-mail from:", descAf: "Ontvang en deurlees van e-pos vanaf:", key: "min3" },
    { num: "05", descEn: "Draft letter, document, affidavit, court document for:", descAf: "Opstel van brief, dokument, beëdigde verklaring, hofstuk vir:", key: "min4" },
    { num: "06", descEn: "Send letter with attachments to:", descAf: "Stuur brief met aanhangsels aan:", key: "min5" },
    { num: "07", descEn: "Study of e-mail received from:", descAf: "Deurlees van e-pos ontvang van:", key: "min6" },
    { num: "08", descEn: "Draft e-mail to:", descAf: "Skryf e-pos aan:", key: "min7" },
    { num: "09", descEn: "Teleconsultation with:", descAf: "Telefoniese konsultasie met:", key: "min8" },
    { num: "10", descEn: "Receive telephonic instructions from:", descAf: "Ontvang telefoniese instruksies van:", key: "min9" },
    { num: "11", descEn: "Consultation with:", descAf: "Konsultasie met:", key: "min10" },
    { num: "12", descEn: "Visit ___ for consultation with:", descAf: "Besoek ___ vir konsultasie met:", key: "min11" },
    { num: "13", descEn: "Travelling expenses (km @ R per km) from office to, and back:", descAf: "Reiskoste (km @ R per km) van kantoor na en terug:", key: "min12", isKm: true },
    { num: "14", descEn: "Travelling time (min @ 50% of hourly tariff) from office to and back:", descAf: "Reistyd (min @ 50% van uurse tarief) van kantoor na en terug:", key: "min13", isRate13: true },
    { num: "15", descEn: "Preparation for:", descAf: "Voorbereiding vir:", key: "min14" },
    { num: "16", descEn: "Attendance and appear in court:", descAf: "Opwagting en bywoon van verhoor by:", key: "min15" },
  ];

  const rate = parseFloat(invoice.serviceRows?.globalRate || invoice.globalRate || '0') || 0;
  const rate13 = rate / 2;

  formalRows.forEach(row => {
    let amount = 0;

    if (row.key) {
      const minValue = invoice.serviceRows?.[row.key] || '';
      const minutes = parseFloat(minValue) || 0;

      if (row.isKm) {
        amount = Math.round(minutes * rate * 0.006);
      } else if (row.isRate13) {
        amount = Math.round((minutes / 60) * rate13);
      } else {
        amount = Math.round((minutes / 60) * rate);
      }
    } else {
      amount = Number(row.amount) || 0;
    }

    const desc = isEnglish ? row.descEn : row.descAf;

    servicesHTML += `
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; font-size: 14px;">
          <strong>${row.num}.</strong> ${desc}
        </td>
        <td style="padding: 10px; text-align: right; border: 1px solid #ddd; font-size: 14px;">
          R ${amount.toFixed(2)}
        </td>
      </tr>
    `;
  });

  if (Platform.OS === 'web') {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Alert.alert("Error", "Please allow popups to generate PDF");
      return;
    }

    const html = `
      <html>
        <head>
          <title>${fileName}</title>
          <style>
            @media print {
              @page {
                margin-top: 8mm;
                size: A4;
              }
            }

            body { 
              font-family: Arial, sans-serif; 
              padding: 20px 40px; 
              color: #333; 
              max-width: 800px; 
              margin: 0 auto; 
            }

            .header-spacer {
              height: 25px;
              background-color: white;
              margin: -20px -40px 20px -40px;
              position: relative;
              z-index: 99999;
            }

            /* === POLISHED HEADER === */
            .header {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 30px;
              margin-bottom: 25px;
              border-bottom: 3px solid #007AFF;
              padding-bottom: 18px;
            }

            .logo {
              width: 70px;
              height: 70px;
              object-fit: contain;
            }

            .text-block {
              text-align: center;
            }

            .title {
              font-size: 34px;
              color: #007AFF;
              font-weight: bold;
              margin-bottom: 2px;
            }

            .subtitle {
              font-size: 18px;
              color: #333;
            }

            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 25px 0; 
            }
            th, td { 
              padding: 12px; 
              border: 1px solid #ddd; 
              text-align: left; 
            }
            th { 
              background-color: #007AFF; 
              color: white; 
            }
            .total { 
              font-size: 20px; 
              font-weight: bold; 
              text-align: right; 
              margin-top: 25px; 
              color: #007AFF; 
            }
            .footer { 
              margin-top: 50px; 
              font-size: 12px; 
              color: #666; 
              text-align: center;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }

            .filename-bottom {
              margin-top: 40px;
              text-align: center;
              font-size: 10px;
              color: #999;
              user-select: all;
            }

            .bank-section {
              margin-top: 30px;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 8px;
            }
          </style>
        </head>
        <body>
          <!-- Small white bar -->
          <div class="header-spacer"></div>

<!-- POLISHED HEADER -->
<div class="header">
  <img src="${logoSrc}" class="logo" alt="Logo Left">
  
  <div style="text-align: center; flex: 1;">
    <!-- Firm name (most prominent) -->
    <div style="font-size: 22px; font-weight: bold; color: #333; margin-bottom: 4px;">
      ${invoice.companyName || "Your Firm Name"}
    </div>
    
    <!-- INVOICE title -->
    <div style="font-size: 34px; color: #007AFF; font-weight: bold;">
      ${isEnglish ? "INVOICE" : "FAKTUUR"}
    </div>
    
    <!-- Small powered by text -->
    <div style="font-size: 12px; color: #888; margin-top: 2px;">
      ${isEnglish ? "Powered by RDL Legal Pro" : "Aangedryf deur RDL Regs Pro"}
    </div>
  </div>
  
  <img src="${logoSrc}" class="logo" alt="Logo Right">
</div>

<p><strong>${isEnglish ? "Invoice No:" : "Faktuur Nr:"}</strong> ${invoiceNo}</p>
<p><strong>${isEnglish ? "Client:" : "Kliënt:"}</strong> ${clientName}</p>
<p><strong>${isEnglish ? "Date:" : "Datum:"}</strong> ${invoice.date || new Date().toLocaleDateString()}</p>

          <table style="width: 100%; border-collapse: collapse; margin: 25px 0;">
            <tr>
              <th style="background-color: #007AFF; color: white; padding: 12px; text-align: left; border: 1px solid #ddd;">
                ${isEnglish ? "Description" : "Beskrywing"}
              </th>
              <th style="background-color: #007AFF; color: white; padding: 12px; text-align: right; border: 1px solid #ddd; width: 150px;">
                ${isEnglish ? "Amount (R)" : "Bedrag (R)"}
              </th>
            </tr>
            ${servicesHTML}
          </table>

          <div class="total">
            Total: R ${Number(invoice.amount || 0).toFixed(2)}
          </div>

          <!-- Bank Details -->
          <div class="bank-section">
            <h3 style="text-align:center; color:#007AFF; margin-bottom:10px;">
              ${isEnglish ? "Banking Details" : "Bankbesonderhede"}
            </h3>
            <p><strong>${isEnglish ? "Bank:" : "Bank:"}</strong> ${invoice.bankName || "—"}</p>
            <p><strong>${isEnglish ? "Branch Code:" : "Tak Kode:"}</strong> ${invoice.branchCode || "—"}</p>
            <p><strong>${isEnglish ? "Account Number:" : "Rekeningnommer:"}</strong> ${invoice.accountNumber || "—"}</p>
            <p style="margin-top:10px;"><strong>${isEnglish ? "Reference:" : "Verwysing:"}</strong> ${invoiceNo}</p>
          </div>

          <!-- Qualifications -->
          <div style="margin-top: 30px; text-align: center; font-size: 13px; color: #555;">
            <strong>${isEnglish ? "Partners & Qualifications" : "Vennote & Kwalifikasies"}</strong><br>
            ${invoice.qualifications || (isEnglish ? "Add qualifications in Profile" : "Voeg kwalifikasies by in Profiel")}
          </div>

          <div class="footer">
            <p>${isEnglish ? "Invoice provided without prejudice to rights." : "Faktuur verskaf sonder vooroordeel tot regte."}</p>
            <p>${isEnglish ? "The firm reserves the right to make corrections." : "Die firma behou die reg voor om regstellings te maak."}</p>
          </div>

          <!-- Filename at bottom -->
          <div class="filename-bottom">
            ${fileName}
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.document.title = fileName;

    setTimeout(() => {
      printWindow.print();
    }, 500);

    return;
  }

  // Mobile
  Alert.alert("Mobile PDF", "Mobile support coming soon");
};