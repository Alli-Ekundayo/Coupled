import { LocalDemoSnapshot } from '../store/useStudioStore';
import { Part, ProjectDetail, SourcingEntry } from '../api/types';
import { parseKicadPcb } from './parseKicadPcb';

const SAMPLE_KICAD_PCB = `(kicad_pcb
  (version 20241229)
  (generator "hackpcb")
  (general (thickness 1.6))
  (layers
    (0 "F.Cu" signal)
    (31 "B.Cu" signal)
    (37 "F.SilkS" user "F.Silkscreen")
    (39 "F.CrtYd" user "F.Courtyard")
    (44 "Edge.Cuts" user)
  )
  (net 0 "")
  (net 1 "VBUS")
  (net 2 "GND")
  (net 3 "3V3")
  (net 4 "I2C_SDA")
  (net 5 "I2C_SCL")
  (net 6 "LED_A")

  (gr_rect (start 0 0) (end 42 30) (stroke (width 0.15) (type default)) (layer "Edge.Cuts"))

  (footprint "Connector_USB:USB_C_Receptacle_GCT_USB4125-xx-x_6P_TopMnt_Horizontal"
    (layer "F.Cu")
    (at 4.8 15.0 90)
    (property "Reference" "J1")
    (property "Value" "TYPE-C-31-M-17")
    (fp_line (start -4.5 -3.6) (end 4.5 -3.6) (layer "F.SilkS") (width 0.12))
    (fp_line (start 4.5 -3.6) (end 4.5 3.6) (layer "F.SilkS") (width 0.12))
    (fp_line (start 4.5 3.6) (end -4.5 3.6) (layer "F.SilkS") (width 0.12))
    (fp_line (start -4.5 3.6) (end -4.5 -3.6) (layer "F.SilkS") (width 0.12))
    (fp_rect (start -4.9 -4.1) (end 4.9 4.1) (layer "F.CrtYd") (width 0.05))
    (pad "A9" smd roundrect (at -1.6 3.1 90) (size 0.65 1.4) (layers "F.Cu" "F.Mask") (net 1 "VBUS"))
    (pad "B9" smd roundrect (at 1.6 3.1 90) (size 0.65 1.4) (layers "F.Cu" "F.Mask") (net 1 "VBUS"))
    (pad "A12" smd roundrect (at -3.1 3.1 90) (size 0.65 1.4) (layers "F.Cu" "F.Mask") (net 2 "GND"))
    (pad "B12" smd roundrect (at 3.1 3.1 90) (size 0.65 1.4) (layers "F.Cu" "F.Mask") (net 2 "GND"))
  )

  (footprint "Package_TO_SOT_SMD:SOT-23-5"
    (layer "F.Cu")
    (at 15.0 10.5 0)
    (property "Reference" "U1")
    (property "Value" "AP2112K-3.3TRG1")
    (fp_rect (start -1.9 -1.7) (end 1.9 1.7) (layer "F.CrtYd") (width 0.05))
    (fp_rect (start -1.4 -0.8) (end 1.4 0.8) (layer "F.SilkS") (width 0.12))
    (pad "1" smd roundrect (at -0.95 1.1) (size 0.6 1.1) (layers "F.Cu") (net 1 "VBUS"))
    (pad "2" smd roundrect (at 0 1.1) (size 0.6 1.1) (layers "F.Cu") (net 2 "GND"))
    (pad "3" smd roundrect (at 0.95 1.1) (size 0.6 1.1) (layers "F.Cu") (net 1 "VBUS"))
    (pad "4" smd roundrect (at 0.95 -1.1) (size 0.6 1.1) (layers "F.Cu") (net 0 ""))
    (pad "5" smd roundrect (at -0.95 -1.1) (size 0.6 1.1) (layers "F.Cu") (net 3 "3V3"))
  )

  (footprint "Capacitor_SMD:C_0603_1608Metric"
    (layer "F.Cu")
    (at 14.5 16.0 0)
    (property "Reference" "C1")
    (property "Value" "10uF")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 1 "VBUS"))
    (pad "2" smd roundrect (at 0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 2 "GND"))
  )

  (footprint "Capacitor_SMD:C_0603_1608Metric"
    (layer "F.Cu")
    (at 21.0 10.0 90)
    (property "Reference" "C2")
    (property "Value" "100nF")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0 90) (size 0.9 0.95) (layers "F.Cu") (net 3 "3V3"))
    (pad "2" smd roundrect (at 0.8 0 90) (size 0.9 0.95) (layers "F.Cu") (net 2 "GND"))
  )

  (footprint "Sensor_Pressure:Bosch_LGA-8_2.5x2.5mm_P0.65mm"
    (layer "F.Cu")
    (at 26.5 15.0 0)
    (property "Reference" "U2")
    (property "Value" "BME280")
    (fp_rect (start -1.9 -1.9) (end 1.9 1.9) (layer "F.CrtYd") (width 0.05))
    (fp_rect (start -1.35 -1.35) (end 1.35 1.35) (layer "F.SilkS") (width 0.12))
    (pad "1" smd roundrect (at -1.1 -0.975) (size 0.7 0.4) (layers "F.Cu") (net 2 "GND"))
    (pad "2" smd roundrect (at -1.1 -0.325) (size 0.7 0.4) (layers "F.Cu") (net 3 "3V3"))
    (pad "3" smd roundrect (at -1.1 0.325) (size 0.7 0.4) (layers "F.Cu") (net 4 "I2C_SDA"))
    (pad "4" smd roundrect (at -1.1 0.975) (size 0.7 0.4) (layers "F.Cu") (net 5 "I2C_SCL"))
    (pad "6" smd roundrect (at 1.1 0.325) (size 0.7 0.4) (layers "F.Cu") (net 3 "3V3"))
    (pad "8" smd roundrect (at 1.1 -0.975) (size 0.7 0.4) (layers "F.Cu") (net 3 "3V3"))
  )

  (footprint "Resistor_SMD:R_0603_1608Metric"
    (layer "F.Cu")
    (at 24.0 21.5 0)
    (property "Reference" "R1")
    (property "Value" "4.7k")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 3 "3V3"))
    (pad "2" smd roundrect (at 0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 4 "I2C_SDA"))
  )

  (footprint "Resistor_SMD:R_0603_1608Metric"
    (layer "F.Cu")
    (at 30.0 21.5 0)
    (property "Reference" "R2")
    (property "Value" "4.7k")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 3 "3V3"))
    (pad "2" smd roundrect (at 0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 5 "I2C_SCL"))
  )

  (footprint "LED_SMD:LED_0603_1608Metric"
    (layer "F.Cu")
    (at 15.0 23.0 0)
    (property "Reference" "D1")
    (property "Value" "Green")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 6 "LED_A"))
    (pad "2" smd roundrect (at 0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 2 "GND"))
  )

  (footprint "Resistor_SMD:R_0603_1608Metric"
    (layer "F.Cu")
    (at 9.5 23.0 0)
    (property "Reference" "R3")
    (property "Value" "1k")
    (fp_rect (start -1.5 -0.85) (end 1.5 0.85) (layer "F.CrtYd") (width 0.05))
    (pad "1" smd roundrect (at -0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 3 "3V3"))
    (pad "2" smd roundrect (at 0.8 0) (size 0.9 0.95) (layers "F.Cu") (net 6 "LED_A"))
  )

  (footprint "Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical"
    (layer "F.Cu")
    (at 36.8 15.0 0)
    (property "Reference" "J2")
    (property "Value" "I2C_HDR")
    (fp_rect (start -1.5 -5.3) (end 1.5 5.3) (layer "F.CrtYd") (width 0.05))
    (pad "1" thru_hole rect (at 0 -3.81) (size 1.7 1.7) (drill 1.0) (layers "*.Cu" "*.Mask") (net 3 "3V3"))
    (pad "2" thru_hole oval (at 0 -1.27) (size 1.7 1.7) (drill 1.0) (layers "*.Cu" "*.Mask") (net 2 "GND"))
    (pad "3" thru_hole oval (at 0 1.27) (size 1.7 1.7) (drill 1.0) (layers "*.Cu" "*.Mask") (net 4 "I2C_SDA"))
    (pad "4" thru_hole oval (at 0 3.81) (size 1.7 1.7) (drill 1.0) (layers "*.Cu" "*.Mask") (net 5 "I2C_SCL"))
  )

  (segment (start 7.9 13.4) (end 12.2 13.4) (width 0.5) (layer "F.Cu") (net 1))
  (segment (start 12.2 13.4) (end 14.05 11.6) (width 0.5) (layer "F.Cu") (net 1))
  (segment (start 14.05 11.6) (end 13.7 16.0) (width 0.5) (layer "F.Cu") (net 1))
  (segment (start 14.05 9.4) (end 21.0 9.4) (width 0.5) (layer "F.Cu") (net 3))
  (segment (start 21.0 9.4) (end 25.4 14.025) (width 0.5) (layer "F.Cu") (net 3))
  (segment (start 27.6 14.025) (end 34.0 14.025) (width 0.5) (layer "F.Cu") (net 3))
  (segment (start 34.0 14.025) (end 36.8 11.19) (width 0.5) (layer "F.Cu") (net 3))
  (segment (start 21.0 9.2) (end 21.0 7.2) (width 0.5) (layer "F.Cu") (net 3))
  (segment (start 21.0 7.2) (end 8.7 7.2) (width 0.5) (layer "B.Cu") (net 3))
  (segment (start 8.7 7.2) (end 8.7 23.0) (width 0.5) (layer "B.Cu") (net 3))
  (segment (start 10.3 23.0) (end 14.2 23.0) (width 0.25) (layer "F.Cu") (net 6))
  (segment (start 25.4 15.325) (end 24.8 16.0) (width 0.25) (layer "F.Cu") (net 4))
  (segment (start 24.8 16.0) (end 24.8 21.5) (width 0.25) (layer "F.Cu") (net 4))
  (segment (start 24.8 16.27) (end 36.8 16.27) (width 0.25) (layer "B.Cu") (net 4))
  (segment (start 25.4 15.975) (end 30.8 18.81) (width 0.25) (layer "F.Cu") (net 5))
  (segment (start 30.8 18.81) (end 36.8 18.81) (width 0.25) (layer "F.Cu") (net 5))
  (segment (start 30.8 18.81) (end 30.8 21.5) (width 0.25) (layer "F.Cu") (net 5))
  (segment (start 15.0 11.6) (end 15.3 16.0) (width 0.5) (layer "B.Cu") (net 2))
  (segment (start 15.3 16.0) (end 15.8 23.0) (width 0.5) (layer "B.Cu") (net 2))
  (segment (start 25.4 14.025) (end 25.4 13.73) (width 0.5) (layer "B.Cu") (net 2))
  (segment (start 25.4 13.73) (end 36.8 13.73) (width 0.5) (layer "B.Cu") (net 2))

  (via (at 21.0 7.2) (size 0.6) (drill 0.3) (net 3))
  (via (at 8.7 23.0) (size 0.6) (drill 0.3) (net 3))
  (via (at 24.8 16.27) (size 0.6) (drill 0.3) (net 4))
  (via (at 15.0 11.6) (size 0.6) (drill 0.3) (net 2))
)`;

const SAMPLE_SCHEMATIC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 820 480" width="820" height="480">
  <rect width="820" height="480" fill="#0d1117"/>
  <g stroke="#1e2631" stroke-width="1">
    <line x1="0" y1="80" x2="820" y2="80"/><line x1="0" y1="160" x2="820" y2="160"/>
    <line x1="0" y1="240" x2="820" y2="240"/><line x1="0" y1="320" x2="820" y2="320"/>
    <line x1="0" y1="400" x2="820" y2="400"/>
    <line x1="160" y1="0" x2="160" y2="480"/><line x1="320" y1="0" x2="320" y2="480"/>
    <line x1="480" y1="0" x2="480" y2="480"/><line x1="640" y1="0" x2="640" y2="480"/>
  </g>
  <rect x="44" y="130" width="118" height="170" rx="6" fill="#161b22" stroke="#989dab" stroke-width="1.5"/>
  <text x="103" y="156" fill="#eceef2" font-family="monospace" font-size="13" font-weight="700" text-anchor="middle">J1 · USB-C</text>
  <text x="103" y="174" fill="#989dab" font-family="monospace" font-size="10" text-anchor="middle">TYPE-C-31-M-17</text>
  <line x1="162" y1="196" x2="270" y2="196" stroke="#ef4444" stroke-width="2.2"/>
  <rect x="190" y="185" width="44" height="18" rx="4" fill="#3a161d" stroke="#ef4444" stroke-width="1"/>
  <text x="212" y="198" fill="#fca5a5" font-family="monospace" font-size="10" text-anchor="middle">VBUS</text>
  <line x1="162" y1="264" x2="660" y2="264" stroke="#6c7080" stroke-width="1.8" stroke-dasharray="5 3"/>
  <text x="196" y="256" fill="#989dab" font-family="monospace" font-size="10">GND</text>
  <rect x="270" y="140" width="142" height="146" rx="6" fill="#161b22" stroke="#00e676" stroke-width="1.5"/>
  <text x="341" y="164" fill="#00e676" font-family="monospace" font-size="13" font-weight="700" text-anchor="middle">U1 · AP2112K-3.3</text>
  <text x="282" y="200" fill="#eceef2" font-family="monospace" font-size="11">1 VIN</text>
  <text x="282" y="220" fill="#eceef2" font-family="monospace" font-size="11">3 EN</text>
  <text x="282" y="268" fill="#eceef2" font-family="monospace" font-size="11">2 GND</text>
  <text x="400" y="200" fill="#eceef2" font-family="monospace" font-size="11" text-anchor="end">VOUT 5</text>
  <line x1="412" y1="196" x2="500" y2="196" stroke="#ef4444" stroke-width="2.2"/>
  <rect x="436" y="185" width="38" height="18" rx="4" fill="#3a161d" stroke="#ef4444" stroke-width="1"/>
  <text x="455" y="198" fill="#fca5a5" font-family="monospace" font-size="10" text-anchor="middle">3V3</text>
  <rect x="500" y="140" width="140" height="150" rx="6" fill="#161b22" stroke="#3b82f6" stroke-width="1.5"/>
  <text x="570" y="164" fill="#93c5fd" font-family="monospace" font-size="13" font-weight="700" text-anchor="middle">U2 · BME280</text>
  <text x="512" y="200" fill="#eceef2" font-family="monospace" font-size="11">6,8 VDD</text>
  <text x="512" y="228" fill="#eceef2" font-family="monospace" font-size="11">3 SDA</text>
  <text x="512" y="248" fill="#eceef2" font-family="monospace" font-size="11">4 SCL</text>
  <line x1="640" y1="224" x2="690" y2="224" stroke="#3b82f6" stroke-width="2"/>
  <line x1="640" y1="244" x2="690" y2="244" stroke="#3b82f6" stroke-width="2"/>
  <rect x="690" y="176" width="90" height="114" rx="6" fill="#161b22" stroke="#e8c85a" stroke-width="1.5"/>
  <text x="735" y="200" fill="#e8c85a" font-family="monospace" font-size="12" font-weight="700" text-anchor="middle">J2 · HDR</text>
  <text x="702" y="228" fill="#eceef2" font-family="monospace" font-size="10">3 I2C_SDA</text>
  <text x="702" y="248" fill="#eceef2" font-family="monospace" font-size="10">4 I2C_SCL</text>
  <text x="44" y="446" fill="#6c7080" font-family="monospace" font-size="11">LOCAL DEMO SCHEMATIC PREVIEW · USB-C 3.3V BME280 SENSOR BOARD · ERC PASS</text>
</svg>`;

const SAMPLE_PARTS: Record<string, Part> = {
  J1: {
    mpn: 'TYPE-C-31-M-17',
    lcsc_id: 'C283540',
    category: 'Connectors',
    package: 'USB-C-6P',
    description: 'USB Type-C 6-Pin Power Receptacle Horizontal SMD',
    manufacturer: 'Korean Hroparts Elec',
    value: 'USB-C',
    price: 0.2,
    stock: 22625,
    voltage_max: 20,
    footprint_ref: 'Connector_USB:USB_C_Receptacle_GCT_USB4125-xx-x_6P_TopMnt_Horizontal',
    pins: [
      { num: 'A9', name: 'VBUS', type: 'power_out' },
      { num: 'B9', name: 'VBUS', type: 'power_out' },
      { num: 'A12', name: 'GND', type: 'ground' },
      { num: 'B12', name: 'GND', type: 'ground' },
    ],
    score: null,
    octopart_url: '',
  },
  U1: {
    mpn: 'AP2112K-3.3TRG1',
    lcsc_id: 'C51118',
    category: 'Power Management',
    package: 'SOT-23-5',
    description: '600mA 3.3V Low Dropout Linear Regulator',
    manufacturer: 'Diodes Incorporated',
    value: '3.3V',
    price: 0.14,
    stock: 48900,
    voltage_max: 6.0,
    footprint_ref: 'Package_TO_SOT_SMD:SOT-23-5',
    pins: [
      { num: '1', name: 'VIN', type: 'power_in' },
      { num: '2', name: 'GND', type: 'ground' },
      { num: '3', name: 'EN', type: 'input' },
      { num: '4', name: 'NC', type: 'nc' },
      { num: '5', name: 'VOUT', type: 'power_out' },
    ],
    score: null,
    octopart_url: '',
  },
  U2: {
    mpn: 'BME280',
    lcsc_id: 'C92489',
    category: 'Sensors',
    package: 'LGA-8',
    description: 'Combined Humidity, Pressure & Temperature I2C/SPI Sensor',
    manufacturer: 'Bosch Sensortec',
    value: 'BME280',
    price: 2.85,
    stock: 6420,
    voltage_max: 3.6,
    footprint_ref: 'Sensor_Pressure:Bosch_LGA-8_2.5x2.5mm_P0.65mm',
    pins: [
      { num: '1', name: 'GND', type: 'ground' },
      { num: '2', name: 'CSB', type: 'input' },
      { num: '3', name: 'SDI', type: 'bidir' },
      { num: '4', name: 'SCK', type: 'input' },
      { num: '6', name: 'VDDIO', type: 'power_in' },
      { num: '8', name: 'VDD', type: 'power_in' },
    ],
    score: null,
    octopart_url: '',
  },
  C1: {
    mpn: 'CL10A106KP8NNNC',
    lcsc_id: 'C19702',
    category: 'Capacitors',
    package: '0603',
    description: '10uF 10V X5R Ceramic Capacitor',
    manufacturer: 'Samsung Electro-Mechanics',
    value: '10uF',
    price: 0.02,
    stock: 92000,
    voltage_max: 10,
    footprint_ref: 'Capacitor_SMD:C_0603_1608Metric',
    pins: [
      { num: '1', name: '1', type: 'passive' },
      { num: '2', name: '2', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  C2: {
    mpn: 'CL10B104KB8NNNC',
    lcsc_id: 'C1591',
    category: 'Capacitors',
    package: '0603',
    description: '100nF 50V X7R Ceramic Capacitor',
    manufacturer: 'Samsung Electro-Mechanics',
    value: '100nF',
    price: 0.01,
    stock: 150000,
    voltage_max: 50,
    footprint_ref: 'Capacitor_SMD:C_0603_1608Metric',
    pins: [
      { num: '1', name: '1', type: 'passive' },
      { num: '2', name: '2', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  R1: {
    mpn: 'RC0603FR-074K7L',
    lcsc_id: 'C23162',
    category: 'Resistors',
    package: '0603',
    description: '4.7k Ohm 1% 0603 Thick Film Resistor',
    manufacturer: 'YAGEO',
    value: '4.7k',
    price: 0.005,
    stock: 185000,
    voltage_max: 75,
    footprint_ref: 'Resistor_SMD:R_0603_1608Metric',
    pins: [
      { num: '1', name: '1', type: 'passive' },
      { num: '2', name: '2', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  R2: {
    mpn: 'RC0603FR-074K7L',
    lcsc_id: 'C23162',
    category: 'Resistors',
    package: '0603',
    description: '4.7k Ohm 1% 0603 Thick Film Resistor',
    manufacturer: 'YAGEO',
    value: '4.7k',
    price: 0.005,
    stock: 185000,
    voltage_max: 75,
    footprint_ref: 'Resistor_SMD:R_0603_1608Metric',
    pins: [
      { num: '1', name: '1', type: 'passive' },
      { num: '2', name: '2', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  D1: {
    mpn: 'KT-0603G',
    lcsc_id: 'C72043',
    category: 'LEDs',
    package: '0603',
    description: 'Green 570nm 0603 SMD Power Indicator LED',
    manufacturer: 'KENTO',
    value: 'Green',
    price: 0.02,
    stock: 64000,
    voltage_max: 5,
    footprint_ref: 'LED_SMD:LED_0603_1608Metric',
    pins: [
      { num: '1', name: 'A', type: 'passive' },
      { num: '2', name: 'K', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  R3: {
    mpn: 'RC0603FR-071KL',
    lcsc_id: 'C21190',
    category: 'Resistors',
    package: '0603',
    description: '1k Ohm 1% 0603 Current Limiting Resistor',
    manufacturer: 'YAGEO',
    value: '1k',
    price: 0.005,
    stock: 210000,
    voltage_max: 75,
    footprint_ref: 'Resistor_SMD:R_0603_1608Metric',
    pins: [
      { num: '1', name: '1', type: 'passive' },
      { num: '2', name: '2', type: 'passive' },
    ],
    score: null,
    octopart_url: '',
  },
  J2: {
    mpn: 'PM254-1-04-S-8.5',
    lcsc_id: 'C492401',
    category: 'Connectors',
    package: 'PinHeader-1x04',
    description: '4-Pin 2.54mm Vertical I2C Breakout Header',
    manufacturer: 'BOOMELE',
    value: 'I2C_HDR',
    price: 0.05,
    stock: 31000,
    voltage_max: 250,
    footprint_ref: 'Connector_PinHeader_2.54mm:PinHeader_1x04_P2.54mm_Vertical',
    pins: [
      { num: '1', name: '3V3', type: 'power_in' },
      { num: '2', name: 'GND', type: 'ground' },
      { num: '3', name: 'SDA', type: 'bidir' },
      { num: '4', name: 'SCL', type: 'input' },
    ],
    score: null,
    octopart_url: '',
  },
};

export function createLocalSampleProject(): LocalDemoSnapshot {
  const sourcing: SourcingEntry[] = Object.entries(SAMPLE_PARTS).map(([ref, p]) => ({
    ref,
    mpn: p.mpn,
    lcsc_id: p.lcsc_id,
    footprint_ref: p.footprint_ref,
    source: 'preset',
    price: p.price,
    stock: p.stock,
  }));

  const detail: ProjectDetail = {
    project_id: 'local_sample_bme280',
    owner_user_id: null,
    design_brief: {
      prompt: 'USB-C powered 3.3V BME280 I2C environmental sensor board with power indicator LED',
      board_name: 'USB-C BME280 Sensor Board (Local Sample)',
      summary: '5V USB-C regulated via AP2112K-3.3TRG1 feeding Bosch BME280 and 4-pin I2C breakout.',
      board_width_mm: 42,
      board_height_mm: 30,
      power_rails: ['VBUS', '3V3', 'GND'],
      interfaces: ['USB-C Power', 'I2C'],
    },
    components: sourcing,
    parts: SAMPLE_PARTS,
    netlist: {
      nets: {
        VBUS: [['J1', 'A9'], ['J1', 'B9'], ['U1', '1'], ['U1', '3'], ['C1', '1']],
        GND: [['J1', 'A12'], ['J1', 'B12'], ['U1', '2'], ['C1', '2'], ['C2', '2'], ['U2', '1'], ['D1', '2'], ['J2', '2']],
        '3V3': [['U1', '5'], ['C2', '1'], ['U2', '2'], ['U2', '6'], ['U2', '8'], ['R1', '1'], ['R2', '1'], ['R3', '1'], ['J2', '1']],
        I2C_SDA: [['U2', '3'], ['R1', '2'], ['J2', '3']],
        I2C_SCL: [['U2', '4'], ['R2', '2'], ['J2', '4']],
        LED_A: [['R3', '2'], ['D1', '1']],
      },
      net_classes: {
        VBUS: 'power',
        GND: 'power',
        '3V3': 'power',
        I2C_SDA: 'signal',
        I2C_SCL: 'signal',
        LED_A: 'signal',
      },
      components: Object.entries(SAMPLE_PARTS).map(([ref, p]) => ({
        ref,
        mpn: p.mpn,
        lcsc_id: p.lcsc_id,
        value: p.value,
        footprint_ref: p.footprint_ref,
        package: p.package,
      })),
    },
    placements: [
      { ref: 'J1', x: 4.8, y: 15.0, rotation: 90 },
      { ref: 'U1', x: 15.0, y: 10.5, rotation: 0 },
      { ref: 'C1', x: 14.5, y: 16.0, rotation: 0 },
      { ref: 'C2', x: 21.0, y: 10.0, rotation: 90 },
      { ref: 'U2', x: 26.5, y: 15.0, rotation: 0 },
      { ref: 'R1', x: 24.0, y: 21.5, rotation: 0 },
      { ref: 'R2', x: 30.0, y: 21.5, rotation: 0 },
      { ref: 'D1', x: 15.0, y: 23.0, rotation: 0 },
      { ref: 'R3', x: 9.5, y: 23.0, rotation: 0 },
      { ref: 'J2', x: 36.8, y: 15.0, rotation: 0 },
    ],
    drc: {
      engine: 'builtin',
      passed: true,
      error_count: 0,
      warning_count: 0,
      unconnected_count: 0,
      violations: [],
    },
    review:
      '- Local sample preview generated offline (no backend connection required).\n- 2-layer FR4 board (42 x 30 mm) with AP2112K-3.3 LDO, BME280, I2C pull-ups, and green 3V3 LED.\n- Connect a running hackpcb FastAPI backend to design custom circuits, run KiCad 9 DRC, and export Gerber ZIPs.',
    chat_history: [
      {
        role: 'assistant',
        content:
          'Loaded local sample USB-C BME280 board so you can explore the 2D PCB, 3D WebGL board, Schematic, and Inspector offline. Start your hackpcb backend on localhost:8000 (or set the API URL) to run live AI designs.',
      },
    ],
    exports: {
      kicad_pcb: '/api/v1/projects/local_sample_bme280/export?format=kicad_pcb',
      kicad_sch: '/api/v1/projects/local_sample_bme280/export?format=kicad_sch',
      schematic_svg: '/api/v1/projects/local_sample_bme280/export?format=schematic_svg',
      pcb_svg: '/api/v1/projects/local_sample_bme280/export?format=svg',
      bom: '/api/v1/projects/local_sample_bme280/export?format=bom',
      gerber: '/api/v1/projects/local_sample_bme280/export?format=gerber',
      drc: '/api/v1/projects/local_sample_bme280/drc',
    },
  };

  const bomLines = [
    'Comment,Designator,Footprint,LCSC Part #',
    ...Object.entries(SAMPLE_PARTS).map(
      ([ref, p]) => `"${p.mpn}",${ref},"${p.footprint_ref}",${p.lcsc_id}`,
    ),
  ];

  return {
    detail,
    kicadPcbText: SAMPLE_KICAD_PCB,
    kicadSchText: `(kicad_sch (version 20250114) (generator "hackpcb") (title_block (title "USB-C BME280 Sensor Board")))`,
    schematicSvg: SAMPLE_SCHEMATIC_SVG,
    bomCsv: bomLines.join('\n'),
  };
}

/**
 * Builds a local inspectable Studio snapshot from an uploaded `.kicad_pcb` file so users
 * can immediately inspect 2D copper, 3D extruded FR-4 geometry, nets, and BOM offline.
 */
export function createLocalUploadedProject(
  fileName: string,
  kicadPcbText: string
): LocalDemoSnapshot {
  const parsed = parseKicadPcb(kicadPcbText);
  const projectId =
    fileName
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'uploaded_board';

  const parts: Record<string, Part> = {};
  const sourcing: SourcingEntry[] = [];
  const nets: Record<string, [string, string][]> = {};
  const netClasses: Record<string, string> = {};

  for (const fp of parsed.footprints) {
    if (!fp.ref) continue;
    const pkg = fp.lib.split(':').pop() ?? '';
    const pins = fp.pads.map((pd) => {
      if (pd.netName) {
        if (!nets[pd.netName]) {
          nets[pd.netName] = [];
          netClasses[pd.netName] = /gnd|vcc|vdd|vbus|3v3|5v/i.test(pd.netName)
            ? 'power'
            : 'signal';
        }
        nets[pd.netName].push([fp.ref, pd.num]);
      }
      return {
        num: pd.num,
        name: pd.netName || pd.type,
        type: 'passive' as const,
      };
    });

    parts[fp.ref] = {
      mpn: fp.value || pkg || fp.ref,
      lcsc_id: '',
      category: '',
      package: pkg,
      description: fp.lib,
      manufacturer: '',
      value: fp.value,
      price: 0,
      stock: 0,
      voltage_max: null,
      footprint_ref: fp.lib,
      pins,
      score: null,
      octopart_url: '',
    };

    sourcing.push({
      ref: fp.ref,
      mpn: fp.value || pkg || fp.ref,
      footprint_ref: fp.lib,
      source: 'preset',
    });
  }

  const detail: ProjectDetail = {
    project_id: projectId,
    owner_user_id: null,
    design_brief: {
      board_name: fileName,
      summary: `Uploaded ${fileName} (${parsed.footprints.length} parts, ${parsed.segments.length} segments, ${parsed.vias.length} vias).`,
      board_width_mm: Number(parsed.bounds.width.toFixed(1)),
      board_height_mm: Number(parsed.bounds.height.toFixed(1)),
    },
    components: sourcing,
    parts,
    netlist: {
      nets,
      net_classes: netClasses,
    },
    placements: parsed.footprints.map((fp) => ({
      ref: fp.ref,
      x: fp.x,
      y: fp.y,
      rotation: fp.rot,
    })),
    drc: null,
    review: `Loaded local file ${fileName}. Run backend SA Placement, 2-Layer Routing, or KiCad 9 DRC from the Pipeline tab.`,
    chat_history: [
      {
        role: 'assistant',
        content: `Loaded ${fileName} locally (${parsed.footprints.length} footprints, ${Object.keys(nets).length} nets). Switch between 2D and 3D views or use the Pipeline tab to re-place or route on a running hackpcb backend.`,
      },
    ],
    exports: {
      kicad_pcb: `/api/v1/projects/${projectId}/export?format=kicad_pcb`,
      kicad_sch: `/api/v1/projects/${projectId}/export?format=kicad_sch`,
      schematic_svg: `/api/v1/projects/${projectId}/export?format=schematic_svg`,
      pcb_svg: `/api/v1/projects/${projectId}/export?format=svg`,
      bom: `/api/v1/projects/${projectId}/export?format=bom`,
      gerber: `/api/v1/projects/${projectId}/export?format=gerber`,
      drc: `/api/v1/projects/${projectId}/drc`,
    },
  };

  const bomLines = [
    'Comment,Designator,Footprint,LCSC Part #',
    ...Object.entries(parts).map(
      ([ref, p]) => `"${p.mpn}",${ref},"${p.footprint_ref}",${p.lcsc_id}`
    ),
  ];

  return {
    detail,
    kicadPcbText,
    kicadSchText: `(kicad_sch (version 20250114) (generator "hackpcb") (title_block (title "${fileName}")))`,
    schematicSvg: '',
    bomCsv: bomLines.join('\n'),
  };
}
