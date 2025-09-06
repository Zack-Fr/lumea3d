# CreateSceneItemDto


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**categoryKey** | **string** | Category key referencing project assets | [default to undefined]
**model** | **string** | Optional model identifier within category | [optional] [default to undefined]
**positionX** | **number** | Position X coordinate | [optional] [default to undefined]
**positionY** | **number** | Position Y coordinate | [optional] [default to undefined]
**positionZ** | **number** | Position Z coordinate | [optional] [default to undefined]
**rotationX** | **number** | Rotation X (pitch) in degrees | [optional] [default to undefined]
**rotationY** | **number** | Rotation Y (yaw) in degrees | [optional] [default to undefined]
**rotationZ** | **number** | Rotation Z (roll) in degrees | [optional] [default to undefined]
**scaleX** | **number** | Scale X factor | [optional] [default to undefined]
**scaleY** | **number** | Scale Y factor | [optional] [default to undefined]
**scaleZ** | **number** | Scale Z factor | [optional] [default to undefined]
**materialVariant** | **string** | Material variant identifier | [optional] [default to undefined]
**selectable** | **boolean** | Whether the item can be selected | [optional] [default to undefined]
**locked** | **boolean** | Whether the item is locked from editing | [optional] [default to undefined]
**meta** | **object** | Additional metadata as JSON | [optional] [default to undefined]
**materialOverrides** | **object** | Material property overrides as JSON | [optional] [default to undefined]

## Example

```typescript
import { CreateSceneItemDto } from './api';

const instance: CreateSceneItemDto = {
    categoryKey,
    model,
    positionX,
    positionY,
    positionZ,
    rotationX,
    rotationY,
    rotationZ,
    scaleX,
    scaleY,
    scaleZ,
    materialVariant,
    selectable,
    locked,
    meta,
    materialOverrides,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
