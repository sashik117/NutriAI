import { nutriApi } from '@/api/nutriApi';

function createRepository(entityClient) {
  return {
    list(sort, limit) {
      return entityClient.list(sort, limit);
    },

    filter(filters = {}, sort, limit) {
      return entityClient.filter(filters, sort, limit);
    },

    create(data) {
      return entityClient.create(data);
    },

    update(id, data) {
      return entityClient.update(id, data);
    },

    delete(id) {
      return entityClient.delete(id);
    },
  };
}

export const userProfileRepository = createRepository(nutriApi.entities.UserProfile);
export const foodLogRepository = createRepository(nutriApi.entities.FoodLog);
export const waterLogRepository = createRepository(nutriApi.entities.WaterLog);
export const weightLogRepository = createRepository(nutriApi.entities.WeightLog);
export const bodyMeasurementRepository = createRepository(nutriApi.entities.BodyMeasurement);
export const achievementRepository = createRepository(nutriApi.entities.Achievement);
export const mealPlanRepository = createRepository(nutriApi.entities.MealPlan);
