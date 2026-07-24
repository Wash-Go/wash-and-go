import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MapsProvider } from '@wash-and-go/maps';
import { TomTomProvider } from './tomtom.provider';
import { HaversineProvider } from './haversine.provider';
import { GeocodeController } from './geocode.controller';
import { MAPS_PROVIDER } from './maps.constants';

export { MAPS_PROVIDER } from './maps.constants';

/*
 * Picks the maps adapter from config (D10). MAPS_PROVIDER=tomtom + a key → the
 * TomTom adapter; otherwise the keyless haversine fallback, so distance always
 * works. Global so any domain (zones, pricing) can inject it. Google adapter
 * slots in here later behind MAPS_PROVIDER=google.
 */
@Global()
@Module({
  controllers: [GeocodeController],
  providers: [
    {
      provide: MAPS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): MapsProvider => {
        const logger = new Logger('MapsModule');
        const provider = config.get<string>('MAPS_PROVIDER');
        const tomtomKey = config.get<string>('TOMTOM_API_KEY');
        if (provider === 'tomtom' && tomtomKey) {
          logger.log('Maps provider: tomtom');
          return new TomTomProvider(tomtomKey);
        }
        logger.log('Maps provider: haversine (no key — distance only)');
        return new HaversineProvider();
      },
    },
  ],
  exports: [MAPS_PROVIDER],
})
export class MapsModule {}
