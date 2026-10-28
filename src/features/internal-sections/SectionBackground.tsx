const CONTOURS = [
  'M160 -70 C600 0 100 240 490 310 S1120 290 1240 640',
  'M190 -70 C630 0 130 228 510 294 S1130 278 1260 620',
  'M220 -70 C660 0 160 216 530 278 S1140 266 1280 600',
  'M250 -70 C690 0 190 204 550 262 S1150 254 1300 580',
  'M280 -70 C720 0 220 192 570 246 S1160 242 1320 560',
  'M310 -70 C750 0 250 180 590 230 S1170 230 1340 540',
  'M340 -70 C780 0 280 168 610 214 S1180 218 1360 520',
  'M370 -70 C810 0 310 156 630 198 S1190 206 1380 500',
  'M400 -70 C840 0 340 144 650 182 S1200 194 1400 480',
  'M430 -70 C870 0 370 132 670 166 S1210 182 1420 460',
  'M460 -70 C900 0 400 120 690 150 S1220 170 1440 440',
  'M490 -70 C930 0 430 108 710 134 S1230 158 1460 420',
]

export function SectionBackground() {
  return (
    <div className="section-background" aria-hidden="true">
      <svg className="section-background-contours" viewBox="0 0 1440 700" fill="none" focusable="false">
        <g stroke="currentColor" strokeWidth="0.8">
          {CONTOURS.map(path => <path key={path} d={path} />)}
        </g>
      </svg>
    </div>
  )
}
