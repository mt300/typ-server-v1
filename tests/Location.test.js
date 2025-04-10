const {getLocationRange} = require('../functions/location'); // Importa a função

describe('Bounding Box Calculation', () => {
    test('Deve calcular corretamente os limites para um raio de 10 km', () => {
        const result = getLocationRange(-23.5505, -46.6333, 10);
        
        expect(result.latMin).toBeCloseTo(-23.6403, 4);
        expect(result.latMax).toBeCloseTo(-23.4607, 4);
        expect(result.lonMin).toBeCloseTo(-46.7440, 4);
        expect(result.lonMax).toBeCloseTo(-46.5226, 4);
    });

    test('Deve calcular corretamente um raio de 50 km', () => {
        const result = getLocationRange(0, 0, 50); // Linha do Equador
        
        expect(result.latMin).toBeCloseTo(-0.4492, 4);
        expect(result.latMax).toBeCloseTo(0.4492, 4);
        expect(result.lonMin).toBeCloseTo(-0.4492, 4);
        expect(result.lonMax).toBeCloseTo(0.4492, 4);
    });

    test('Funciona corretamente em latitudes altas (perto do polo)', () => {
        const result = getLocationRange(80, 0, 10); // Latitude perto do Polo Norte
        
        expect(result.latMin).toBeCloseTo(79.9108, 4);
        expect(result.latMax).toBeCloseTo(80.0892, 4);
        expect(result.lonMin).toBeCloseTo(-5.7083, 4); // Longitude muda mais rápido
        expect(result.lonMax).toBeCloseTo(5.7083, 4);
    });

    test('Retorna valores dentro de um range realista', () => {
        const result = getLocationRange(-23.5505, -46.6333, 500);

        expect(result.latMin).toBeGreaterThan(-30); // Dentro do hemisfério
        expect(result.latMax).toBeLessThan(-15);
        expect(result.lonMin).toBeGreaterThan(-55);
        expect(result.lonMax).toBeLessThan(-40);
    });
});
