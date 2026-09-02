import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });


  it('/graphql (POST) schema introspection', () => {
    return request(app.getHttpServer())
      .post('/graphql')
      .send({
        query: '{ __schema { types { name } } }',
      })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
        expect(res.body.statusCode).toBe(200);
        expect(res.body.message).toBe('Success');
        expect(res.body.data.__schema.types).toBeDefined();
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
