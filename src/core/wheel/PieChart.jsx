/*
  Componente PieChart para representar un horario de 24 horas en un gráfico circular.
  Muestra actividades y tiempos libres, permitiendo interacción con las actividades.
*/

const CENTER = 200;
const RADIUS = 180;
const LABEL_RADIUS = 120;
const TOTAL_MINUTES = 24 * 60; // 1440 minutos en un día

const PieChart = ({ schedule, currentDay, onActivitySelect }) => {

  // Función para determinar si el día es hoy
  const isToday = (dayName) => {
  const daysMap = {
    'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3,
    'Jueves': 4, 'Viernes': 5, 'Sábado': 6
  };
    const today = new Date().getDay();
    return daysMap[dayName] === today;
  };

    /**
   * Crea un horario completo de 24 horas con espacios vacíos
   */
  const createFullSchedule = (schedule) => {
    // Si no hay ninguna actividad, devolver un día completo sin asignar
    if (!schedule || schedule.length === 0) {
      return [{
        activity: 'Sin asignar',
        title: 'Sin asignar',
        color: '#d1d5db',
        start: 0,
        end: 24,
        description: 'No hay actividades programadas para este día',
        isEmpty: true,
        isFullDay: true
      }];
    }

    const fullSchedule = [];
    let currentMinutes = 0;

    // Ordenar el schedule por hora de inicio
    const sortedSchedule = [...schedule].sort((a, b) => a.start - b.start);

    sortedSchedule.forEach((item) => {
      const itemStartMinutes = Math.round(item.start * 60); // Convertir horas decimales a minutos
      const itemEndMinutes = Math.round(item.end * 60);

      // Si hay un hueco antes de esta actividad, añadir tiempo vacío
      if (currentMinutes < itemStartMinutes) {
        fullSchedule.push({
          activity: 'Libre',
          color: '#e5e7eb',
          start: currentMinutes / 60,
          end: itemStartMinutes / 60,
          description: 'Tiempo libre',
          isEmpty: true
        });
      }

      // Añadir la actividad actual
      fullSchedule.push({
        ...item,
        start: itemStartMinutes / 60,
        end: itemEndMinutes / 60
      });
      currentMinutes = itemEndMinutes;
    });

    // Si quedan minutos al final del día, añadir tiempo vacío
    if (currentMinutes < TOTAL_MINUTES) {
      fullSchedule.push({
        activity: 'Libre',
        color: '#e5e7eb',
        start: currentMinutes / 60,
        end: 24,
        description: 'Tiempo libre',
        isEmpty: true
      });
    }

    return fullSchedule;
  };

  const fullSchedule = createFullSchedule(schedule);
  let currentAngle = -90; // Empezar desde las 12 (arriba)

  const polarToCartesian = (angle, radius) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.cos(rad),
      y: CENTER + radius * Math.sin(rad)
    };
  };

  const formatTime = (hours) => {
    const hour = Math.floor(hours);
    const minutes = Math.round((hours - hour) * 60);
    
    // Manejar caso donde minutos son 60 (por redondeo)
    let adjustedHour = hour;
    let adjustedMinutes = minutes;
    
    if (minutes === 60) {
      adjustedHour = hour + 1;
      adjustedMinutes = 0;
    }
    
    // Manejar caso donde la hora es 24 (medianoche)
    if (adjustedHour === 24) {
      adjustedHour = 0;
    }
    
    return `${adjustedHour.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  };

  const renderSlices = () =>
    fullSchedule.map((item, index) => {
      const startHours = item.start;
      const endHours = item.end;
      const durationHours = endHours - startHours;
      
      // Calcular el ángulo basado en la duración en horas
      const angle = (durationHours / 24) * 360;
      const endAngle = currentAngle + angle;

      const largeArcFlag = angle > 180 ? 1 : 0;

      const start = polarToCartesian(currentAngle, RADIUS);
      const end = polarToCartesian(endAngle, RADIUS);

      const path = `
        M ${CENTER} ${CENTER}
        L ${start.x} ${start.y}
        A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${end.x} ${end.y}
        Z
      `;

      const labelAngle = currentAngle + angle / 2;
      const label = polarToCartesian(labelAngle, LABEL_RADIUS);

      // Para actividades reales, necesitamos encontrar su índice original
      let originalIndex = -1;
      if (!item.isEmpty) {
        originalIndex = schedule.findIndex(a => 
          a.id === item.id || 
          (a.start === item.start && a.end === item.end && a.title === item.activity)
        );
      }

      const showLabel = durationHours >= 0.25; // Mostrar etiqueta si dura 15 min o más (reducido de 0.5 a 0.25)
      
      const sliceContent = (
        <>
          <path 
            d={path} 
            fill={item.color}
            stroke="white"
            strokeWidth="2"
            opacity={item.isEmpty ? "0.4" : "1"}
          />

          {showLabel && (
            <>
              <text
                x={label.x}
                y={item.isFullDay ? label.y : label.y - 5}
                textAnchor="middle"
                fill={item.isFullDay ? "#9ca3af" : "white"}
                fontSize={item.isFullDay ? "20" : "16"}
                fontWeight="bold"
                style={{ 
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                  pointerEvents: 'none'
                }}
              >
                {item.title || item.activity}
              </text>

              {!item.isFullDay && (
                <text
                  x={label.x}
                  y={label.y + 14}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="500"
                  style={{ 
                    textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                  }}
                >
                  {formatTime(item.start)}-{formatTime(item.end)}
                </text>
              )}
            </>
          )}
        </>
      );

      currentAngle = endAngle;

      if (item.isEmpty) {
        return (
          <g
            key={`empty-${index}`}
            className="wheel-slice wheel-slice-empty"
          >
            {sliceContent}
          </g>
        );
      }

      return (
        <g
          key={`${item.id || item.title}-${index}`}
          className="wheel-slice wheel-slice-activity"
          onClick={(e) => {
            e.stopPropagation();
            onActivitySelect(item, originalIndex, e);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onActivitySelect(item, originalIndex, e);
          }}
          style={{ cursor: 'pointer' }}
        >
          {sliceContent}
          
          <title>
            {item.title || item.activity}
            {'\n'}
            {formatTime(item.start)} - {formatTime(item.end)}
            {'\n'}
            {item.description || 'Sin descripción'}
            {'\n'}
            Duración: {Math.floor(durationHours)}h {Math.round((durationHours % 1) * 60)}m
          </title>
        </g>
      );
    });

  // Función para generar las marcas de hora en el borde
  const renderHourMarks = () => {
    const marks = [];
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * 360 - 90;
      const point = polarToCartesian(angle, RADIUS + 10);
      const labelPoint = polarToCartesian(angle, RADIUS - 20);
      
      marks.push(
        <g key={`hour-${i}`}>
          {/* Línea del marcador */}
          <line
            x1={CENTER + (RADIUS - 5) * Math.cos((angle * Math.PI) / 180)}
            y1={CENTER + (RADIUS - 5) * Math.sin((angle * Math.PI) / 180)}
            x2={CENTER + (RADIUS + 5) * Math.cos((angle * Math.PI) / 180)}
            y2={CENTER + (RADIUS + 5) * Math.sin((angle * Math.PI) / 180)}
            stroke="#64748b"
            strokeWidth="1"
            opacity="0.3"
          />
          
          {/* Etiqueta de hora cada 2 horas para evitar sobrecarga */}
          {i % 2 === 0 && (
            <text
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#64748b"
              fontSize="10"
              fontWeight="500"
              opacity="0.6"
            >
              {`${i.toString().padStart(2, '0')}:00`}
            </text>
          )}
        </g>
      );
    }
    return marks;
  };

  return (
    <svg 
      viewBox="0 0 400 400" 
      className="wheel-svg"
      style={{ width: '100%', height: 'auto' }}
    >
      {/* Marcas de hora en el borde */}
      {renderHourMarks()}
      
      {/* Segmentos del horario */}
      {renderSlices()}

      {/* Centro simple y limpio */}
      <circle 
        cx={CENTER} 
        cy={CENTER} 
        r="60" 
        fill="white"
        opacity="0.95"
      />

      <text
        x={CENTER}
        y={isToday(currentDay) ? CENTER - 8 : CENTER}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1e293b"
        fontSize="20"
        fontWeight="bold"
      >
        {currentDay}
      </text>
      
      {isToday(currentDay) && (
        <text
          x={CENTER}
          y={CENTER + 16}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#64748b"
          fontSize="12"
        >
          Hoy
        </text>
      )}
    </svg>
  );
};

export default PieChart;