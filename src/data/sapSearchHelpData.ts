import { SapDataType } from '../types/sap';

export interface SapTableFieldHelp {
  field: string;
  label: string;
  datatype: SapDataType;
  length: number;
  isKey?: boolean;
  description: string;
}

export interface SapTableHelp {
  table: string;
  name: string;
  module: 'SD' | 'MM' | 'FI' | 'CO' | 'PP' | 'PM' | 'QM' | 'COMMON';
  description: string;
  fields: SapTableFieldHelp[];
}

export const SAP_SEARCH_HELP_TABLES: SapTableHelp[] = [
  // ==========================================
  // SD (Sales & Distribution)
  // ==========================================
  {
    table: 'VBAK',
    name: 'Sales Document: Header Data (판매오더 헤더)',
    module: 'SD',
    description: 'Master header table for Sales Orders, quotations, inquiries, and returns',
    fields: [
      { field: 'VBELN', label: 'Sales Order No (판매오더 번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Sales and Distribution Document Number' },
      { field: 'ERDAT', label: 'Creation Date (생성일자)', datatype: 'DATS', length: 8, description: 'Date on which the record was created' },
      { field: 'ERZET', label: 'Entry Time (입력시간)', datatype: 'TIMS', length: 6, description: 'Entry time' },
      { field: 'ERNAM', label: 'Created By (생성자)', datatype: 'CHAR', length: 12, description: 'Name of Person who Created the Object' },
      { field: 'AUART', label: 'Sales Doc Type (오더 유형)', datatype: 'CHAR', length: 4, description: 'Sales Document Type (e.g., OR, RE, SO)' },
      { field: 'VKORG', label: 'Sales Organization (영업조직)', datatype: 'CHAR', length: 4, description: 'Sales Organization' },
      { field: 'VTWEG', label: 'Distribution Channel (유통채널)', datatype: 'CHAR', length: 2, description: 'Distribution Channel' },
      { field: 'SPART', label: 'Division (제품군)', datatype: 'CHAR', length: 2, description: 'Division' },
      { field: 'VKBUR', label: 'Sales Office (영업소)', datatype: 'CHAR', length: 4, description: 'Sales Office' },
      { field: 'VKGRP', label: 'Sales Group (영업그룹)', datatype: 'CHAR', length: 3, description: 'Sales Group' },
      { field: 'KUNNR', label: 'Sold-to Party (고객코드)', datatype: 'CHAR', length: 10, description: 'Customer Sold-to Party Number' },
      { field: 'NETWR', label: 'Net Value (총 공급가액)', datatype: 'CURR', length: 15, description: 'Net Value of the Sales Order in Document Currency' },
      { field: 'WAERK', label: 'Currency (전표 통화)', datatype: 'CHAR', length: 5, description: 'SD Document Currency (e.g., KRW, USD)' },
      { field: 'LIFSK', label: 'Delivery Block (납품보류)', datatype: 'CHAR', length: 2, description: 'Delivery block (document header)' },
      { field: 'FAKSK', label: 'Billing Block (청구보류)', datatype: 'CHAR', length: 2, description: 'Billing block in sales document' },
    ],
  },
  {
    table: 'VBAP',
    name: 'Sales Document: Item Data (판매오더 품목)',
    module: 'SD',
    description: 'Line item details including material, plant, quantity, and item pricing',
    fields: [
      { field: 'VBELN', label: 'Sales Order No (판매오더 번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Sales Document' },
      { field: 'POSNR', label: 'Item Number (품목 번호)', datatype: 'NUMC', length: 6, isKey: true, description: 'Sales Document Item' },
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, description: 'Material Number' },
      { field: 'ARKTX', label: 'Short Text (품목 내역)', datatype: 'CHAR', length: 40, description: 'Short Text for Sales Order Item' },
      { field: 'WERKS', label: 'Plant (플랜트)', datatype: 'CHAR', length: 4, description: 'Plant (Own or External)' },
      { field: 'LGORT', label: 'Storage Location (저장위치)', datatype: 'CHAR', length: 4, description: 'Storage Location' },
      { field: 'KWMENG', label: 'Order Quantity (오더수량)', datatype: 'DEC', length: 13, description: 'Cumulative Order Quantity in Sales Units' },
      { field: 'VRKME', label: 'Sales Unit (판매단위)', datatype: 'UNIT', length: 3, description: 'Sales Unit of Measure' },
      { field: 'NETWR', label: 'Net Amount (품목 공급가액)', datatype: 'CURR', length: 15, description: 'Net Value of the Item' },
      { field: 'PSTYV', label: 'Item Category (품목 범주)', datatype: 'CHAR', length: 4, description: 'Sales Document Item Category' },
      { field: 'PRCTR', label: 'Profit Center (손익센터)', datatype: 'CHAR', length: 10, description: 'Profit Center' },
    ],
  },
  {
    table: 'VBRK',
    name: 'Billing Document: Header Data (대금청구 헤더)',
    module: 'SD',
    description: 'Header data for customer billing invoices and credit/debit memos',
    fields: [
      { field: 'VBELN', label: 'Billing Doc (청구전표 번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Billing Document Number' },
      { field: 'FKART', label: 'Billing Type (청구 유형)', datatype: 'CHAR', length: 4, description: 'Billing Type (e.g., F2)' },
      { field: 'FKDAT', label: 'Billing Date (청구일자)', datatype: 'DATS', length: 8, description: 'Billing date for index printout' },
      { field: 'KUNAG', label: 'Sold-to Party (매출고객)', datatype: 'CHAR', length: 10, description: 'Sold-to party' },
      { field: 'KUNRG', label: 'Payer (지급인)', datatype: 'CHAR', length: 10, description: 'Payer' },
      { field: 'NETWR', label: 'Net Amount (청구 공급가액)', datatype: 'CURR', length: 15, description: 'Net Value in Document Currency' },
      { field: 'WAERK', label: 'Currency (청구통화)', datatype: 'CHAR', length: 5, description: 'SD document currency' },
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, description: 'Company code to be billed' },
    ],
  },
  {
    table: 'VBRP',
    name: 'Billing Document: Item Data (대금청구 품목)',
    module: 'SD',
    description: 'Line item records for customer billing invoices',
    fields: [
      { field: 'VBELN', label: 'Billing Doc (청구전표 번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Billing Document' },
      { field: 'POSNR', label: 'Item Number (품목 번호)', datatype: 'NUMC', length: 6, isKey: true, description: 'Billing Item' },
      { field: 'FKIMG', label: 'Billed Quantity (청구수량)', datatype: 'DEC', length: 13, description: 'Actual Invoiced Quantity' },
      { field: 'VRKME', label: 'Sales Unit (판매단위)', datatype: 'UNIT', length: 3, description: 'Sales Unit' },
      { field: 'NETWR', label: 'Item Net Value (품목 금액)', datatype: 'CURR', length: 15, description: 'Net Value of Item' },
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, description: 'Material Number' },
      { field: 'ARKTX', label: 'Item Description (품목 내역)', datatype: 'CHAR', length: 40, description: 'Short text for sales order item' },
    ],
  },
  {
    table: 'KNA1',
    name: 'Customer Master: General Data (고객 마스터 일반)',
    module: 'SD',
    description: 'Master record for customer business partners across client level',
    fields: [
      { field: 'KUNNR', label: 'Customer Number (고객코드)', datatype: 'CHAR', length: 10, isKey: true, description: 'Customer Account Number' },
      { field: 'NAME1', label: 'Customer Name 1 (고객 상호명)', datatype: 'CHAR', length: 35, description: 'Name 1' },
      { field: 'LAND1', label: 'Country (국가코드)', datatype: 'CHAR', length: 3, description: 'Country Key (KR, US, DE)' },
      { field: 'ORT01', label: 'City (도시)', datatype: 'CHAR', length: 35, description: 'City' },
      { field: 'PSTLZ', label: 'Postal Code (우편번호)', datatype: 'CHAR', length: 10, description: 'Postal Code' },
      { field: 'STCD1', label: 'Tax Registration (사업자등록번호)', datatype: 'CHAR', length: 16, description: 'Tax Number 1' },
    ],
  },

  // ==========================================
  // MM (Materials Management / Purchasing)
  // ==========================================
  {
    table: 'EKKO',
    name: 'Purchasing Document: Header (구매발주 헤더)',
    module: 'MM',
    description: 'Header records for Purchase Orders, RFQs, and Scheduling Agreements',
    fields: [
      { field: 'EBELN', label: 'PO Number (구매발주번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Purchasing Document Number' },
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, description: 'Company Code' },
      { field: 'BSTYP', label: 'Doc Category (전표 범주)', datatype: 'CHAR', length: 1, description: 'Purchasing Document Category (F=PO, K=Contract)' },
      { field: 'BSART', label: 'Order Type (발주 유형)', datatype: 'CHAR', length: 4, description: 'Purchasing Document Type (NB, UB)' },
      { field: 'LIFNR', label: 'Vendor Code (공급업체코드)', datatype: 'CHAR', length: 10, description: 'Vendor Account Number' },
      { field: 'EKORG', label: 'Purchasing Org (구매조직)', datatype: 'CHAR', length: 4, description: 'Purchasing Organization' },
      { field: 'EKGRP', label: 'Purchasing Group (구매그룹)', datatype: 'CHAR', length: 3, description: 'Purchasing Group' },
      { field: 'WAERS', label: 'Currency (발주통화)', datatype: 'CHAR', length: 5, description: 'Currency Key' },
      { field: 'BEDAT', label: 'PO Date (발주일자)', datatype: 'DATS', length: 8, description: 'Purchasing Document Date' },
    ],
  },
  {
    table: 'EKPO',
    name: 'Purchasing Document: Item (구매발주 품목)',
    module: 'MM',
    description: 'Line item records for materials and services in Purchase Orders',
    fields: [
      { field: 'EBELN', label: 'PO Number (구매발주번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Purchasing Document Number' },
      { field: 'EBELP', label: 'Item Number (품목번호)', datatype: 'NUMC', length: 5, isKey: true, description: 'Item Number of Purchasing Document' },
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, description: 'Material Number' },
      { field: 'TXZ01', label: 'Short Text (품목 내역)', datatype: 'CHAR', length: 40, description: 'Short Text' },
      { field: 'WERKS', label: 'Plant (플랜트)', datatype: 'CHAR', length: 4, description: 'Plant' },
      { field: 'LGORT', label: 'Storage Loc (저장위치)', datatype: 'CHAR', length: 4, description: 'Storage Location' },
      { field: 'MENGE', label: 'PO Quantity (발주수량)', datatype: 'DEC', length: 13, description: 'Purchase Order Quantity' },
      { field: 'MEINS', label: 'Order Unit (발주단위)', datatype: 'UNIT', length: 3, description: 'Purchase Order Unit of Measure' },
      { field: 'NETPR', label: 'Net Price (단가)', datatype: 'CURR', length: 11, description: 'Net Price in Purchasing Document' },
      { field: 'NETWR', label: 'Net Amount (품목 발주금액)', datatype: 'CURR', length: 15, description: 'Net Order Value in PO Currency' },
    ],
  },
  {
    table: 'MARA',
    name: 'General Material Data (자재 마스터 일반)',
    module: 'MM',
    description: 'Central material master data defining material properties',
    fields: [
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, isKey: true, description: 'Material Number' },
      { field: 'MTART', label: 'Material Type (자재유형)', datatype: 'CHAR', length: 4, description: 'Material Type (FERT, ROH, HALB, HAWA)' },
      { field: 'MATKL', label: 'Material Group (자재그룹)', datatype: 'CHAR', length: 9, description: 'Material Group' },
      { field: 'MEINS', label: 'Base Unit (기본단위)', datatype: 'UNIT', length: 3, description: 'Base Unit of Measure (EA, KG, M)' },
      { field: 'BRGEW', label: 'Gross Weight (총중량)', datatype: 'DEC', length: 13, description: 'Gross Weight' },
      { field: 'GEWEI', label: 'Weight Unit (중량단위)', datatype: 'UNIT', length: 3, description: 'Weight Unit' },
      { field: 'ERSDA', label: 'Created On (생성일자)', datatype: 'DATS', length: 8, description: 'Created On' },
    ],
  },
  {
    table: 'MARC',
    name: 'Plant Data for Material (자재 플랜트 데이터)',
    module: 'MM',
    description: 'Plant-specific planning and procurement parameters for materials',
    fields: [
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, isKey: true, description: 'Material Number' },
      { field: 'WERKS', label: 'Plant (플랜트)', datatype: 'CHAR', length: 4, isKey: true, description: 'Plant' },
      { field: 'EKGRP', label: 'Purchasing Group (구매그룹)', datatype: 'CHAR', length: 3, description: 'Purchasing Group' },
      { field: 'DISPO', label: 'MRP Controller (MRP 담당자)', datatype: 'CHAR', length: 3, description: 'MRP Controller' },
      { field: 'BESKZ', label: 'Procurement Type (조달유형)', datatype: 'CHAR', length: 1, description: 'Procurement Type (E=In-house, F=External)' },
    ],
  },
  {
    table: 'LFA1',
    name: 'Vendor Master: General Data (공급업체 마스터)',
    module: 'MM',
    description: 'Master records for suppliers and vendors',
    fields: [
      { field: 'LIFNR', label: 'Vendor Account (공급업체코드)', datatype: 'CHAR', length: 10, isKey: true, description: 'Account Number of Vendor or Creditor' },
      { field: 'NAME1', label: 'Vendor Name (업체 상호명)', datatype: 'CHAR', length: 35, description: 'Name 1' },
      { field: 'LAND1', label: 'Country (국가코드)', datatype: 'CHAR', length: 3, description: 'Country Key' },
      { field: 'ORT01', label: 'City (도시)', datatype: 'CHAR', length: 35, description: 'City' },
      { field: 'STCD1', label: 'Tax Registration (사업자등록번호)', datatype: 'CHAR', length: 16, description: 'Tax Number 1' },
    ],
  },

  // ==========================================
  // FI (Financial Accounting)
  // ==========================================
  {
    table: 'BKPF',
    name: 'Accounting Document: Header (회계전표 헤더)',
    module: 'FI',
    description: 'General ledger, AP, and AR financial accounting document headers',
    fields: [
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, isKey: true, description: 'Company Code' },
      { field: 'BELNR', label: 'Document Number (회계전표번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Accounting Document Number' },
      { field: 'GJAHR', label: 'Fiscal Year (회계연도)', datatype: 'NUMC', length: 4, isKey: true, description: 'Fiscal Year' },
      { field: 'BLART', label: 'Document Type (전표유형)', datatype: 'CHAR', length: 2, description: 'Document Type (SA, KR, DR)' },
      { field: 'BLDAT', label: 'Document Date (증빙일자)', datatype: 'DATS', length: 8, description: 'Document Date in Document' },
      { field: 'BUDAT', label: 'Posting Date (전기일자)', datatype: 'DATS', length: 8, description: 'Posting Date in the Document' },
      { field: 'MONAT', label: 'Period (전기기간)', datatype: 'NUMC', length: 2, description: 'Fiscal Period (1-12, 13-16)' },
      { field: 'WAERS', label: 'Currency (통화)', datatype: 'CHAR', length: 5, description: 'Currency Key' },
      { field: 'BKTXT', label: 'Header Text (전표헤더 텍스트)', datatype: 'CHAR', length: 25, description: 'Document Header Text' },
    ],
  },
  {
    table: 'BSEG',
    name: 'Accounting Document: Segment (회계전표 개별항목)',
    module: 'FI',
    description: 'Detailed line items of financial accounting documents',
    fields: [
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, isKey: true, description: 'Company Code' },
      { field: 'BELNR', label: 'Doc Number (회계전표번호)', datatype: 'CHAR', length: 10, isKey: true, description: 'Accounting Document Number' },
      { field: 'GJAHR', label: 'Fiscal Year (회계연도)', datatype: 'NUMC', length: 4, isKey: true, description: 'Fiscal Year' },
      { field: 'BUZEI', label: 'Line Item (라인 항목)', datatype: 'NUMC', length: 3, isKey: true, description: 'Number of Line Item Within Document' },
      { field: 'BSCHL', label: 'Posting Key (전기키)', datatype: 'CHAR', length: 2, description: 'Posting Key (40=Debit, 50=Credit)' },
      { field: 'KOART', label: 'Account Type (계정유형)', datatype: 'CHAR', length: 1, description: 'Account type (S=GL, D=Customer, K=Vendor)' },
      { field: 'HKONT', label: 'G/L Account (총계정원장 계정)', datatype: 'CHAR', length: 10, description: 'General Ledger Account' },
      { field: 'DMBTR', label: 'Local Currency Amount (원화금액)', datatype: 'CURR', length: 13, description: 'Amount in Local Currency' },
      { field: 'WRBTR', label: 'Document Amount (전표금액)', datatype: 'CURR', length: 13, description: 'Amount in Document Currency' },
      { field: 'SHKZG', label: 'Debit/Credit (차대구분)', datatype: 'CHAR', length: 1, description: 'Debit/Credit Indicator (S=Debit, H=Credit)' },
      { field: 'KOSTL', label: 'Cost Center (코스트센터)', datatype: 'CHAR', length: 10, description: 'Cost Center' },
      { field: 'PRCTR', label: 'Profit Center (손익센터)', datatype: 'CHAR', length: 10, description: 'Profit Center' },
      { field: 'SGTXT', label: 'Item Text (적요)', datatype: 'CHAR', length: 50, description: 'Item Text' },
    ],
  },
  {
    table: 'T001',
    name: 'Company Codes (회사코드 마스터)',
    module: 'FI',
    description: 'Central definition of SAP legal entities and company codes',
    fields: [
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, isKey: true, description: 'Company Code' },
      { field: 'BUTXT', label: 'Company Name (회사명)', datatype: 'CHAR', length: 25, description: 'Name of Company Code' },
      { field: 'ORT01', label: 'City (도시)', datatype: 'CHAR', length: 25, description: 'City' },
      { field: 'LAND1', label: 'Country (국가코드)', datatype: 'CHAR', length: 3, description: 'Country Key' },
      { field: 'WAERS', label: 'Currency (원화/통화)', datatype: 'CHAR', length: 5, description: 'Currency Key' },
      { field: 'KTOPL', label: 'Chart of Accounts (계정과목표)', datatype: 'CHAR', length: 4, description: 'Chart of Accounts' },
    ],
  },

  // ==========================================
  // CO (Controlling / Management Accounting)
  // ==========================================
  {
    table: 'CSKS',
    name: 'Cost Center Master: Header (코스트센터 마스터)',
    module: 'CO',
    description: 'Cost center master record including validity period and assignment',
    fields: [
      { field: 'KOKRS', label: 'Controlling Area (관리회계영역)', datatype: 'CHAR', length: 4, isKey: true, description: 'Controlling Area' },
      { field: 'KOSTL', label: 'Cost Center (코스트센터)', datatype: 'CHAR', length: 10, isKey: true, description: 'Cost Center' },
      { field: 'DATBI', label: 'Valid To (종료일)', datatype: 'DATS', length: 8, isKey: true, description: 'Valid To Date' },
      { field: 'DATAB', label: 'Valid From (시작일)', datatype: 'DATS', length: 8, description: 'Valid-From Date' },
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, description: 'Company Code' },
      { field: 'KOSAR', label: 'Category (코스트센터 범주)', datatype: 'CHAR', length: 1, description: 'Cost Center Category' },
      { field: 'VERAK', label: 'Person Responsible (책임자)', datatype: 'CHAR', length: 20, description: 'User Responsible' },
      { field: 'PRCTR', label: 'Profit Center (손익센터)', datatype: 'CHAR', length: 10, description: 'Profit Center' },
    ],
  },
  {
    table: 'AUFK',
    name: 'Order Master Data (내부오더 마스터)',
    module: 'CO',
    description: 'Internal orders and maintenance orders in Controlling',
    fields: [
      { field: 'AUFNR', label: 'Order Number (오더번호)', datatype: 'CHAR', length: 12, isKey: true, description: 'Order Number' },
      { field: 'AUFART', label: 'Order Type (오더유형)', datatype: 'CHAR', length: 4, description: 'Order Type' },
      { field: 'AUTYP', label: 'Order Category (오더범주)', datatype: 'NUMC', length: 2, description: 'Order Category' },
      { field: 'KTEXT', label: 'Description (오더내역)', datatype: 'CHAR', length: 40, description: 'Description' },
      { field: 'BUKRS', label: 'Company Code (회사코드)', datatype: 'CHAR', length: 4, description: 'Company Code' },
      { field: 'KOSTL', label: 'Cost Center (코스트센터)', datatype: 'CHAR', length: 10, description: 'Cost Center' },
    ],
  },

  // ==========================================
  // PP (Production Planning)
  // ==========================================
  {
    table: 'AFKO',
    name: 'Production Order: Header (생산오더 헤더)',
    module: 'PP',
    description: 'Manufacturing and assembly production order master data',
    fields: [
      { field: 'AUFNR', label: 'Order Number (생산오더번호)', datatype: 'CHAR', length: 12, isKey: true, description: 'Order Number' },
      { field: 'GLTRS', label: 'Sched Finish (완료예정일)', datatype: 'DATS', length: 8, description: 'Scheduled finish date' },
      { field: 'GSTRI', label: 'Actual Start (실제시작일)', datatype: 'DATS', length: 8, description: 'Actual start date' },
      { field: 'GAMNG', label: 'Order Quantity (오더수량)', datatype: 'DEC', length: 13, description: 'Total order quantity' },
      { field: 'GMEIN', label: 'Unit of Measure (수량단위)', datatype: 'UNIT', length: 3, description: 'Base Unit of Measure' },
      { field: 'PLNBEZ', label: 'Material Produced (생산자재)', datatype: 'CHAR', length: 18, description: 'Material Number for Order' },
    ],
  },
  {
    table: 'AFPO',
    name: 'Production Order: Item (생산오더 품목)',
    module: 'PP',
    description: 'Order item and batch records for manufactured goods',
    fields: [
      { field: 'AUFNR', label: 'Order Number (생산오더번호)', datatype: 'CHAR', length: 12, isKey: true, description: 'Order Number' },
      { field: 'POSNR', label: 'Item Number (품목번호)', datatype: 'NUMC', length: 4, isKey: true, description: 'Order Item Number' },
      { field: 'MATNR', label: 'Material Number (자재코드)', datatype: 'CHAR', length: 18, description: 'Material Number' },
      { field: 'PSMNG', label: 'Item Order Qty (품목 수량)', datatype: 'DEC', length: 13, description: 'Order Item Quantity' },
      { field: 'DWERK', label: 'Plant (생산 플랜트)', datatype: 'CHAR', length: 4, description: 'Plant' },
    ],
  },
];
