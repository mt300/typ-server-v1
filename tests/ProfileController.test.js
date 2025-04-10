const supertest = require('supertest');
// const express = require('express');
// const profileRoutes = require('./ProfileController'); // Ajuste o caminho conforme necessário
const ProfileRepository = require('../data/profiles');
const app = require('../index');
// app.use('/profiles', profileRoutes);
const request = supertest(app);

const userExample = ProfileRepository[0];

describe('GET /', () => {
    it('deve retornar status 200 e a mensagem "Hello World"', async () => {
        const response = await request.get('/');
        expect(response.status).toBe(200);
    });
});
describe('GET /profiles', () => {
    it('deve retornar uma lista de perfis com status 200', async () => {
        const response = await request.get('/profiles');
        
        expect(response.status).toBe(200); // Verifica se o status HTTP é 200
        expect(Array.isArray(response.body)).toBe(true); // Verifica se o retorno é um array
        expect(response.body.length).toBeGreaterThan(0); // Verifica se há pelo menos um perfil na lista
        
    });
});

describe('GET /profiles/:id', () => {
    it('deve retornar um perfil existente com status 200', async () => {
        const existingId = userExample.id; // Substitua pelo ID real de um perfil no seu arquivo profiles.js

        const response = await request.get(`/profiles/${existingId}`);

        expect(response.status).toBe(200);
        // expect(response.body).toHaveProperty('id', existingId);
        // expect(response.body).toBe();
        Object.keys(userExample).forEach((key) => {
            expect(response.body).toHaveProperty(key, userExample[key], `Property ${key} with value ${userExample[key]??'undefined'}`);	
        });
    });

    it('deve retornar 404 se o perfil não existir', async () => {
        const nonexistentId = '9999'; // ID que não existe

        const response = await request.get(`/profiles/${nonexistentId}`);

        expect(response.status).toBe(404);
        expect(response.text).toBe('Profile not found');
    });
});

describe("POST /profiles/like/", () => {
    let profiles
    beforeEach(() => {
        // Simulando um banco de perfis em memória
        profiles = ProfileRepository;
        // console.log('profiles',profiles)
    });

    test("Deve permitir que um usuário dê like em outro perfil", async () => {
        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: profiles[1].id });

        expect(response.status).toBe(200);
        expect(response.text).toBe("Liked!");
        expect(profiles.find(p => p.id === profiles[0].id).likes).toContain(profiles[1].id);
    });

    test("Deve gerar um 'match' quando ambos se curtiram", async () => {
        
        const likeSeted = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: profiles[1].id });
        
        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[1].id, profileId: profiles[0].id });
        expect(response.status).toBe(200);
        expect(response.text).toBe("It's a Match!!!");
        expect(profiles[0].matches).toContain(profiles[1].id);
        expect(profiles[1].matches).toContain(profiles[0].id);
    });

    test("Usuário não pode dar like em si mesmo", async () => {
        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: profiles[0].id });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Usuário não pode curtir a si mesmo");
    });

    test("Não deve permitir curtir um perfil inexistente", async () => {
        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: "999" });
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Perfil não encontrado");
    });

    test("Não deve permitir que um usuário inexistente curta um perfil", async () => {
        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: "999", profileId: profiles[0].id });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Usuário não encontrado");
    });

    test("Não deve permitir que um usuário curta o mesmo perfil mais de uma vez", async () => {
        profiles[0].likes.push(profiles[1].id); // Simula que já curtiu

        const response = await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: profiles[1].id });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Usuário já curtiu esse perfil");
    });

    test("Se um match ocorre, ambos devem estar na lista de matches um do outro", async () => {
        profiles[1].likes.push(profiles[0].id); // Simula que o usuário 2 já curtiu o 1

        await request
            .post("/profiles/like/")
            .set('Content-Type', 'application/json')
            .send({ userId: profiles[0].id, profileId: profiles[1].id });

        const user1 = profiles.find(p => p.id === profiles[0].id);
        const user2 = profiles.find(p => p.id === profiles[1].id);

        expect(user1.matches).toContain(profiles[1].id);
        expect(user2.matches).toContain(profiles[0].id);
    });
});

describe("DELETE /profiles/:id/match/", () => {
    let profiles
    beforeEach(() => {
        // Simulando um banco de perfis em memória
        profiles = ProfileRepository;
    });
    test("Deve remover um match existente", async () => {
        profiles[0].matches.push(profiles[1].id); // Simula um match existente
        profiles[1].matches.push(profiles[0].id); // de ambos os lados

        const response = await request.delete(`/profiles/${profiles[0].id}/match/${profiles[1].id}`);
        expect(response.status).toBe(200);
        expect(response.text).toBe("Match removido com sucesso");
        expect(profiles[0].matches).not.toContain(profiles[1].id);
    })
});
describe("POST /profiles", () => {
    test("Deve criar um novo perfil com dados válidos", async () => {
        const newProfile = {
            name: "Perfil Teste",
            email: "teste@perfil.com",
            age: 28,
            gender: 'male',
            location: { city: 'Aracaju', state: 'SE', latitude: -12.97, longitude: -38.50 }
            // adicione outros campos obrigatórios conforme sua implementação
        };

        const response = await request
            .post("/profiles")
            .set('Content-Type', 'application/json')
            .send(newProfile);

        // Supondo que sua API retorne status 201 para criação e o objeto criado
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
        expect(response.body.name).toBe(newProfile.name);
        expect(response.body.email).toBe(newProfile.email);
    });

    test("Deve retornar 400 se dados obrigatórios estiverem faltando", async () => {
        const perfilIncompleto = {
            email: "semnome@perfil.com"
            // Falta o campo 'name' e possivelmente outros obrigatórios
        };

        const response = await request
            .post("/profiles")
            .set('Content-Type', 'application/json')
            .send(perfilIncompleto);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Dados inválidos"); // ajuste a mensagem de erro conforme sua implementação
    });

    test("Não deve permitir a criação de perfil com email duplicado", async () => {
        // Utilizando um perfil já existente, por exemplo userExample
        const perfilDuplicado = {
            name: "Outro Perfil",
            email: userExample.email, // email já existente
            age: 30
        };

        const response = await request
            .post("/profiles")
            .set('Content-Type', 'application/json')
            .send(perfilDuplicado);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Email já cadastrado"); // ajuste conforme sua mensagem
    });
});

describe("PUT /profiles/:id", () => {
    test("Deve atualizar um perfil existente", async () => {
        const existingId = userExample.id;
        const updatedData = {
            name: "Nome Atualizado",
            age: 35
        };

        const response = await request
            .put(`/profiles/${existingId}`)
            .set('Content-Type', 'application/json')
            .send(updatedData);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("id", existingId);
        expect(response.body.name).toBe(updatedData.name);
        expect(response.body.age).toBe(updatedData.age);
    });

    test("Deve retornar 404 ao atualizar um perfil inexistente", async () => {
        const nonexistentId = "9999";
        const updatedData = {
            name: "Nome Qualquer"
        };

        const response = await request
            .put(`/profiles/${nonexistentId}`)
            .set('Content-Type', 'application/json')
            .send(updatedData);

        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Perfil não encontrado");
    });

    test("Deve retornar 400 se os dados enviados forem inválidos", async () => {
        const existingId = userExample.id;
        const invalidData = {
            // Enviando dados inválidos, por exemplo, nome vazio
            name: ""
        };

        const response = await request
            .put(`/profiles/${existingId}`)
            .set('Content-Type', 'application/json')
            .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe("Dados inválidos");
    });
});

describe("DELETE /profiles/:id", () => {
    test("Deve deletar um perfil existente", async () => {
        // Cria um novo perfil para depois deletá-lo e evitar interferir nos perfis já existentes
        const newProfile = {
            name: "Perfil a ser deletado",
            email: "delete@perfil.com",
            age: 22,
            gender: "female",
            location: { city: 'Aracaju', state: 'SE', latitude: -12.97, longitude: -38.50 }
        };

        const createResponse = await request
            .post("/profiles")
            .set('Content-Type', 'application/json')
            .send(newProfile);

        expect(createResponse.status).toBe(201);
        const profileId = createResponse.body.id;


        // Deleta o perfil criado
        const deleteResponse = await request.delete(`/profiles/${profileId}`);
        // console.log('deleteResponse',deleteResponse.body)
        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.text).toBe("Perfil deletado com sucesso");

        // Verifica se ao tentar obter o perfil, retorna 404
        const getResponse = await request.get(`/profiles/${profileId}`);
        expect(getResponse.status).toBe(404);
    });

    test("Deve retornar 404 ao tentar deletar um perfil inexistente", async () => {
        const nonexistentId = "9999";

        const response = await request.delete(`/profiles/${nonexistentId}`);
        expect(response.status).toBe(404);
        expect(response.body.error).toBe("Perfil não encontrado");
    });
});