import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import * as moment from 'moment';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class LolaService {
  private readonly logger = new Logger();
  private ISP_URL: string;
  private INFO_BASE_URL: string;
  private BASE_URL: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.ISP_URL = 'https://resell.lightningproxies.net/api/getplan/isp';
    this.INFO_BASE_URL = 'https://resell.lightningproxies.net/api/info/';
    this.BASE_URL = 'https://resell.lightningproxies.net/api';
  }

  async buyProxy(
    userId: number,
    traffic: number,
    serviceType: string,
  ): Promise<void> {
    const serviceUser = await this.prisma.serviceUser.findFirst({
      where: { userId, serviceType },
    });

    this.logger.log(
      `Buying proxy for traffic ${traffic}, userId ${userId}, serviceType ${serviceType}`,
    );

    if (serviceUser) {
      if (serviceUser.serviceType === 'residential') {
        return await this.handleResidential(serviceUser, traffic);
      } else if (serviceUser.serviceType === 'isp') {
        return await this.handleISP(serviceUser, traffic);
      }
    } else {
      return await this.handleNewUser(userId, traffic, serviceType);
    }
  }

  private async handleResidential(
    serviceUser: any,
    traffic: number,
  ): Promise<any> {
    this.logger.log('Request to Lightning for residential proxy');
    const url = `${this.BASE_URL}/add/${serviceUser.planId}/${traffic}`;

    const result = await lastValueFrom(
      this.httpService.post(url, {}, { headers: this.getHeaders() }),
    );

    const expirationDate = await lastValueFrom(
      this.httpService.get(`${this.INFO_BASE_URL}${serviceUser.planId}`, {
        headers: this.getHeaders(),
      }),
    );

    await this.prisma.serviceUser.update({
      where: { id: serviceUser.id },
      data: {
        traffic: serviceUser.traffic + traffic * 1000,
        currentPeriodEnd: expirationDate.data.expiration_date,
      },
    });

    this.logger.log(`Updated serviceUser: ${serviceUser.id}`);

    return { planId: serviceUser.planId }; // Return planId
  }

  private async handleISP(serviceUser: any, traffic: number): Promise<any> {
    this.logger.log('Handling ISP proxy');
    const data = {
      ip: this.getUserIp(),
      region: this.getUserRegion(),
    };

    const ispResponse = await lastValueFrom(
      this.httpService.post(this.ISP_URL, data, { headers: this.getHeaders() }),
    );

    const planId = ispResponse.data.PlanID;
    const expirationDate = await lastValueFrom(
      this.httpService.get(`${this.INFO_BASE_URL}${planId}`, {
        headers: this.getHeaders(),
      }),
    );

    await this.prisma.serviceUser.create({
      data: {
        userId: serviceUser.userId,
        traffic: traffic * 1000,
        currentPeriodEnd: expirationDate.data.expiration_date,
        providerId: serviceUser.providerId,
        planId,
        serviceType: serviceUser.serviceType,
      },
    });

    return { planId }; // Return planId
  }

  private async handleNewUser(
    userId: number,
    traffic: number,
    serviceType: string,
  ): Promise<any> {
    this.logger.log(
      `Creating new proxy plan for userId: ${userId}, serviceType: ${serviceType}`,
    );

    const baseUrl =
      serviceType === 'residential'
        ? `${this.BASE_URL}/getplan/residential`
        : this.ISP_URL;
    const data =
      serviceType === 'residential'
        ? { bandwidth: Math.floor(traffic) }
        : { ip: this.getUserIp(), region: this.getUserRegion() };

    try {
      this.logger.debug(
        `Requesting plan from ${baseUrl} with data: ${JSON.stringify(data)}`,
      );

      const response = await lastValueFrom(
        this.httpService.post(baseUrl, data, { headers: this.getHeaders() }),
      );

      this.logger.debug(`Received response: ${JSON.stringify(response.data)}`);

      const planId = response.data.PlanID;
      const expirationDate = await lastValueFrom(
        this.httpService.get(`${this.INFO_BASE_URL}${planId}`, {
          headers: this.getHeaders(),
        }),
      );

      await this.prisma.serviceUser.create({
        data: {
          userId,
          traffic: traffic * 1000,
          currentPeriodEnd: expirationDate.data.expiration_date,
          providerId: 1,
          planId,
          serviceType,
        },
      });

      return { planId: response.data.PlanID };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Axios Error: ${error.message}`, {
          url: error.config.url,
          method: error.config.method,
          data: error.config.data,
          headers: error.config.headers,
          statusCode: error.response?.status,
          responseData: error.response?.data,
          stack: error.stack,
        });
      } else {
        this.logger.error(`Unknown error: ${error.message}`, {
          stack: error.stack,
        });
      }

      throw new Error('Failed to create proxy plan');
    }
  }

  private async extendExistingPlan(serviceUser: any, traffic: number) {
    this.logger.log('Extending existing plan');
    const url = `${this.BASE_URL}/add/${serviceUser.planId}/${traffic}`;
    await lastValueFrom(
      this.httpService.post(url, {}, { headers: this.getHeaders() }),
    );

    const newPeriodEnd = moment(serviceUser.currentPeriodEnd)
      .add(1, 'month')
      .toISOString();

    await this.prisma.serviceUser.update({
      where: { id: serviceUser.id },
      data: {
        traffic: serviceUser.traffic + traffic * 1000,
        currentPeriodEnd: newPeriodEnd,
      },
    });
  }

  // Method to fetch bandwidth left for the given planId
  async getBandwidthAsync(planId: string): Promise<number | null> {
    try {
      const url = `${this.BASE_URL}/plan/residential/read/${planId}`;

      // Make the GET request and await the result
      const response = await lastValueFrom(
        this.httpService.get(url, { headers: this.getHeaders() }),
      );

      // Extract the bandwidth left from the response data
      const bandwidthLeft = response.data.bandwidthLeft;
      const lightningGigabytes = bandwidthLeft * 1000; // Convert to gigabytes

      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error(`Error fetching bandwidth: ${error.message}`, {
          url: error.config.url,
          method: error.config.method,
          statusCode: error.response?.status,
          responseData: error.response?.data,
        });
      } else {
        this.logger.error(`Unknown error fetching bandwidth: ${error.message}`);
      }

      return null; // Return null in case of an error
    }
  }

  async createNewPlan(
    userId: number,
    traffic: number,
    serviceType: string,
  ): Promise<void> {
    const baseUrlPlans =
      serviceType === 'residential'
        ? `${this.BASE_URL}/getplan/residential`
        : this.ISP_URL;

    const data =
      serviceType === 'residential'
        ? { bandwidth: traffic } // no need for `(None, traffic)` in JS
        : { ip: await this.getUserIp(), region: await this.getUserRegion() };

    try {
      // Make the POST request to create the plan
      const response = await lastValueFrom(
        this.httpService.post(baseUrlPlans, data, {
          headers: this.getHeaders(),
        }),
      );

      const planId = response.data.PlanID;

      // Fetch the expiration date using the PlanID
      const expirationResponse = await lastValueFrom(
        this.httpService.get(`${this.INFO_BASE_URL}${planId}`, {
          headers: this.getHeaders(),
        }),
      );
      const expirationDate = expirationResponse.data.expiration_date;

      // Create the ServiceUser record in the database (assuming Prisma ORM)
      await this.prisma.serviceUser.create({
        data: {
          userId: userId,
          traffic: traffic * 1000,
          currentPeriodEnd: expirationDate,
          providerId: 1, // Replace with actual providerId if needed
          planId: planId,
          serviceType: serviceType,
          region: await this.getUserRegion(), // Replace this with actual region fetching logic
          ipNumber: await this.getUserIp(), // Replace this with actual IP fetching logic
        },
      });

      this.logger.log(
        `Created new proxy plan for userId ${userId} with planId ${planId}`,
      );
    } catch (error) {
      this.logger.error(`Error creating new plan: ${error.message}`);
      throw new Error('Failed to create new plan');
    }
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': process.env.LOLA_API_KEY,
    };
  }

  private async getUserRegion(): Promise<string> {
    try {
      // You can use 'ipapi.co' or 'ipinfo.io' to fetch the region by IP
      const response = await lastValueFrom(
        this.httpService.get('https://ipinfo.io/json?token=your_api_token'),
      );
      return response.data.region; // Assuming 'region' is part of the API response
    } catch (error) {
      this.logger.error(`Failed to get user's region: ${error.message}`);
      return 'unknown_region';
    }
  }

  private async getUserIp(): Promise<string> {
    try {
      // You can use any public IP provider like 'https://api.ipify.org?format=json'
      const response = await lastValueFrom(
        this.httpService.get('https://api.ipify.org?format=json'),
      );
      return response.data.ip;
    } catch (error) {
      this.logger.error(`Failed to get user's IP address: ${error.message}`);
      return 'unknown_ip';
    }
  }
}
