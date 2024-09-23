import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class LolaService {
  private readonly logger = new Logger(LolaService.name);

  constructor(private readonly httpService: HttpService) {}

  // Метод для активации прокси
  async activateProxy(
    userId: number,
    provider: string,
    serviceType: string,
  ): Promise<any> {
    try {
      let planId;

      if (provider === 'lola' && serviceType === 'residential') {
        this.logger.log(
          `Activating proxy for provider: ${provider}, serviceType: ${serviceType}`,
        );

        // Создаем новый план для residential прокси от 'lola'
        const newPlan = await this.createLolaResidentialPlan(1); // Пример: bandwidth = 1
        planId = newPlan?.PlanID;

        if (!planId) {
          this.logger.error(
            `PlanID is missing from response: ${JSON.stringify(newPlan)}`,
          );
          throw new Error('Failed to create a new proxy plan.');
        }

        // Получаем данные прокси с помощью planId
        const proxyDetails = await this.fetchLolaProxyDetails(planId);

        // Форматируем детали прокси в URL
        const formattedProxyUrls = this.formatProxyJson(proxyDetails);
        return formattedProxyUrls;
      } else {
        throw new Error('Unsupported provider or service type');
      }
    } catch (error) {
      this.logger.error(`Error in activateProxy: ${error.message}`, {
        userId,
        provider,
        serviceType,
        error: error.response?.data || 'Unknown error',
      });
      throw new Error('Failed to activate proxy.');
    }
  }

  // Метод для создания нового residential плана для 'lola'
  private async createLolaResidentialPlan(bandwidth: number): Promise<any> {
    try {
      this.logger.log(
        `Creating new residential plan for Lola with bandwidth: ${bandwidth}`,
      );

      // Отправляем JSON с использованием HttpService
      const response = await lastValueFrom(
        this.httpService.post(
          'https://resell.lightningproxies.net/api/getplan/residential',
          {
            bandwidth: bandwidth.toString(), // В JSON формате
          },
          {
            headers: {
              'x-api-key': process.env.LOLA_API_KEY, // Добавляем API ключ напрямую в заголовки
              'Content-Type': 'application/json', // Указываем, что отправляем JSON
            },
          },
        ),
      );

      this.logger.log(
        `New residential plan response: ${JSON.stringify(response.data)}`,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error creating Lola residential plan: ${error.message}`,
        { errorResponse: error.response?.data },
      );
      throw new Error('Failed to create Lola residential plan.');
    }
  }

  // Метод для получения деталей прокси от 'lola'
  private async fetchLolaProxyDetails(planId: string): Promise<any> {
    try {
      this.logger.log(`Fetching Lola proxy details for planId: ${planId}`);

      const response = await lastValueFrom(
        this.httpService.get(
          `https://resell.lightningproxies.net/api/plan/residential/read/${planId}`,
          {
            headers: {
              'x-api-key': process.env.LOLA_API_KEY, // Добавляем API ключ напрямую в заголовки
              'Content-Type': 'application/json', // Отправляем и получаем JSON
            },
          },
        ),
      );

      this.logger.log(
        `Fetched proxy details: ${JSON.stringify(response.data)}`,
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching Lola proxy details: ${error.message}`, {
        errorResponse: error.response?.data,
      });
      throw new Error('Failed to retrieve Lola proxy information.');
    }
  }

  // Метод для форматирования данных прокси в формате JSON
  private formatProxyJson(proxyData: any): any {
    // Извлекаем поля user и pass, которые приходят из API
    const { user, pass } = proxyData;

    if (!user || !pass) {
      this.logger.error(
        `Missing user or pass in proxyData: ${JSON.stringify(proxyData)}`,
      );
      throw new Error('Missing user or pass in proxy data');
    }

    // Используем фиксированные значения для протокола, хоста и портов

    const session = 'session'; // Статичное значение для session
    const sessionTime = 'sessTime'; // Статичное значение для sess_time

    // Формируем объект в формате JSON, используя реальные user и pass
    return {
      protocols: {
        http: {
          host: '118.193.59.207',
          port: ['16666'],
        },
        socks5: {
          host: '51.159.152.12',
          port: ['11000'],
        },
      },
      login: user, // Используем поле user в качестве login
      password: pass, // Используем поле pass в качестве password
      location: {
        country: 'zone-resi-region',
        state: 'st',
        city: 'city',
      },
      session: session,
      sess_time: sessionTime,
    };
  }
}
