// not in use
package utils

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/meshery/meshery/server/helpers"
	"github.com/meshery/meshery/server/models"
	"github.com/meshery/meshkit/logger"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/dynamic"
)

// CreateK8sResource takes a dynamic client and resource info and tries to create
// that resource.
//
// If a resource already exists and has the label controller set to "meshery"
// then it will try to update the resource.
//
// If a resource exists but does not have the label then the function will return an error
// however if force parameter is set to true then it will replace that resource with a new
// resource with the appropriate labels
//
// It will add labels to the resources:
//
//	"controller": "meshery"
//	"source" : "pattern"
func CreateK8sResource(
	client dynamic.Interface,
	group,
	version,
	resource string,
	object interface{},
	force bool,
	log logger.Handler,
) error {
	resourceByt, err := json.Marshal(object)
	if err != nil {
		return fmt.Errorf("failed to convert given resource into json object")
	}

	resourceMap := map[string]interface{}{}
	if err := json.Unmarshal(resourceByt, &resourceMap); err != nil {
		return fmt.Errorf("failed to convert given resource into json object")
	}

	obj := &unstructured.Unstructured{Object: resourceMap}

	obj.SetLabels(helpers.MergeStringMaps(obj.GetLabels(), map[string]string{
		"controller": "meshery",
		"source":     "pattern",
	}))

	gvr := schema.GroupVersionResource{
		Group:    group,
		Version:  version,
		Resource: resource,
	}

	// Create namespace
	if err := CreateNamespace(client, obj.GetNamespace()); err != nil {
		return err
	}

	if _, err := client.
		Resource(gvr).
		Namespace(obj.GetNamespace()).
		Create(context.TODO(), obj, metav1.CreateOptions{
			FieldManager: "meshery",
		}); err != nil {
		if !errors.IsAlreadyExists(err) {
			err = models.ErrCreateResourceEntry(err)
			log.Error(err)
			return err
		}

		// If the resource already exists then check if it maintained by meshery
		// If the resource is maintained by meshery then update the resource
		// else replace the existing resource with new iff "force" is set to true
		prevObj, err := client.
			Resource(gvr).
			Namespace(obj.GetNamespace()).
			Get(context.TODO(), obj.GetName(), metav1.GetOptions{})
		if err != nil {
			err = models.ErrGetResource(err, obj.GetName(), obj.GetNamespace())
			log.Error(err)
			return err
		}

		prevObjLables := prevObj.GetLabels()
		if prevObjLables["controller"] != "meshery" {
			if force {
				log.Info("resource not maintained by \"meshery\" - force recreating")
				if err := client.
					Resource(gvr).
					Namespace(obj.GetNamespace()).
					Delete(context.TODO(), obj.GetName(), metav1.DeleteOptions{}); err != nil {
					err = models.ErrDeleteResource(err, obj.GetName(), obj.GetNamespace())
					log.Error(err)
					return err
				}

				if _, err := client.
					Resource(gvr).
					Namespace(obj.GetNamespace()).
					Create(context.TODO(), obj, metav1.CreateOptions{
						FieldManager: "meshery",
					}); err != nil {
					err = models.ErrRecreateResource(err, obj.GetName(), obj.GetNamespace())
					log.Error(err)
					return err
				}
			}

			err = models.ErrCreateResourceEntry(fmt.Errorf("failed to create resource: %s - resource already exists and is not maintained by \"meshery\"", obj.GetName()))
			log.Error(err)
			return err
		}

		if _, err := client.
			Resource(gvr).
			Namespace(obj.GetNamespace()).
			Patch(context.TODO(), obj.GetName(), types.MergePatchType, resourceByt, metav1.PatchOptions{
				FieldManager: "meshery",
			}); err != nil {
			err = models.ErrUpdateResource(obj.GetName(), obj.GetNamespace())
			log.Error(err)
			return err
		}
	}

	return nil
}

// DeleteK8sResouce deletes the given kubernetes resource
func DeleteK8sResource(
	client dynamic.Interface,
	group,
	version,
	resource,
	namespace,
	name string,
) error {
	return client.
		Resource(schema.GroupVersionResource{
			Group:    group,
			Version:  version,
			Resource: resource,
		}).
		Namespace(namespace).
		Delete(context.TODO(), name, metav1.DeleteOptions{})
}

// CreateNamespace creates a new Kubernetes namespace with the given name.
// It uses the dynamic client to create the namespace and returns an error if the creation fails.
func CreateNamespace(client dynamic.Interface, namespace string) error {
	ns := v1.Namespace{
		TypeMeta: metav1.TypeMeta{
			APIVersion: "v1",
			Kind:       "Namespace",
		},
		ObjectMeta: metav1.ObjectMeta{
			Name: namespace,
		},
	}

	data, err := json.Marshal(ns)
	if err != nil {
		return err
	}

	if _, err := client.Resource(schema.GroupVersionResource{
		Group:    "",
		Version:  "v1",
		Resource: "namespaces",
	}).Patch(context.TODO(), namespace, types.ApplyPatchType, data, metav1.PatchOptions{
		FieldManager: "meshery",
	}); err != nil {
		return err
	}

	return nil
}
